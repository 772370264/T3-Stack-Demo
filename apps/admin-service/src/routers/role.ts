import { z } from "zod";
import { db } from "@repo/database";
import { router, publicProcedure } from "../trpc.js";

export const roleRouter = router({
    // 获取所有角色（系统角色 + 团队角色）
    getAll: publicProcedure.query(async () => {
        // 1. 获取系统角色成员数（并行查询）
        const [adminCount, userCount] = await Promise.all([
            db.userSystemRole.count({ where: { role: "ADMIN" } }),
            db.userSystemRole.count({ where: { role: "USER" } }),
        ]);

        const systemRoles = [
            {
                id: "ADMIN",
                name: "系统管理员",
                code: "ADMIN",
                type: "system" as const,
                teamName: null,
                teamId: null,
                isAdmin: true,
                memberCount: adminCount,
            },
            {
                id: "USER",
                name: "普通用户",
                code: "USER",
                type: "system" as const,
                teamName: null,
                teamId: null,
                isAdmin: false,
                memberCount: userCount,
            },
        ];

        // 2. 获取团队角色
        const teamRolesRaw = await db.teamRole.findMany({
            include: {
                team: { select: { name: true } },
                _count: { select: { members: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        const teamRoles = teamRolesRaw.map((r) => ({
            id: r.id,
            name: r.name,
            code: r.code,
            type: "team" as const,
            teamName: r.team.name,
            teamId: r.teamId,
            isAdmin: r.isAdmin,
            memberCount: r._count.members,
        }));

        return [...systemRoles, ...teamRoles];
    }),

    // 获取团队角色列表 (保持不变)
    getByTeam: publicProcedure
        .input(z.object({ teamId: z.string() }))
        .query(async ({ input }) => {
            return await db.teamRole.findMany({
                where: { teamId: input.teamId },
                orderBy: { createdAt: "asc" },
                include: {
                    _count: {
                        select: { members: true },
                    },
                },
            });
        }),

    // 创建团队角色
    create: publicProcedure
        .input(
            z.object({
                teamId: z.string(),
                name: z.string().min(2),
                code: z.string().min(2), // 新增 code
                isAdmin: z.boolean().optional(),
            })
        )
        .mutation(async ({ input }) => {
            // 检查重名 (name 和 code 都要检查)
            const existingName = await db.teamRole.findUnique({
                where: { teamId_name: { teamId: input.teamId, name: input.name } },
            });
            if (existingName) throw new Error("角色名称已存在");

            const existingCode = await db.teamRole.findUnique({
                where: { teamId_code: { teamId: input.teamId, code: input.code } },
            });
            if (existingCode) throw new Error("角色编码已存在");

            // 使用事务确保角色创建和菜单复制的原子性
            const defaultMenus = await db.systemRoleMenu.findMany({
                where: { role: "USER" },
                select: { menuId: true },
            });

            const role = await db.$transaction(async (tx) => {
                const newRole = await tx.teamRole.create({
                    data: {
                        teamId: input.teamId,
                        name: input.name,
                        code: input.code,
                        isAdmin: input.isAdmin ?? false,
                    },
                });

                // 自动复制 USER 角色的菜单权限作为默认值
                if (defaultMenus.length > 0) {
                    await tx.teamRoleMenu.createMany({
                        data: defaultMenus.map(m => ({
                            teamRoleId: newRole.id,
                            menuId: m.menuId,
                        })),
                    });
                }

                return newRole;
            });

            return role;
        }),

    // 更新团队角色
    update: publicProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string().min(2).optional(),
                code: z.string().min(2).optional(), // 新增 code
                isAdmin: z.boolean().optional(),
            })
        )
        .mutation(async ({ input }) => {
            const { id, ...data } = input;

            // 如果更新 code 或 name，需要检查唯一性（略过自身）
            if (data.name || data.code) {
                const current = await db.teamRole.findUnique({ where: { id } });
                if (!current) throw new Error("角色不存在");

                if (data.name) {
                    const existing = await db.teamRole.findFirst({
                        where: {
                            teamId: current.teamId,
                            name: data.name,
                            id: { not: id }
                        }
                    });
                    if (existing) throw new Error("角色名称已存在");
                }

                if (data.code) {
                    const existing = await db.teamRole.findFirst({
                        where: {
                            teamId: current.teamId,
                            code: data.code,
                            id: { not: id }
                        }
                    });
                    if (existing) throw new Error("角色编码已存在");
                }
            }

            return await db.teamRole.update({
                where: { id },
                data,
            });
        }),

    // 删除团队角色
    delete: publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
            // 检查是否有成员使用该角色
            const role = await db.teamRole.findUnique({
                where: { id: input.id },
                include: { _count: { select: { members: true } } },
            });

            if (role && role._count.members > 0) {
                throw new Error("该角色下还有成员，无法删除");
            }

            await db.teamRole.delete({ where: { id: input.id } });
            return { success: true };
        }),

    // 获取角色关联的菜单 ID
    getMenus: publicProcedure
        .input(z.object({ roleId: z.string() }))
        .query(async ({ input }) => {
            const result = await db.teamRoleMenu.findMany({
                where: { teamRoleId: input.roleId },
                select: { menuId: true },
            });
            return result.map((r) => r.menuId);
        }),

    // 更新角色菜单权限
    updateMenus: publicProcedure
        .input(
            z.object({
                roleId: z.string(),
                menuIds: z.array(z.string()),
            })
        )
        .mutation(async ({ input }) => {
            await db.$transaction([
                // 删除旧关联
                db.teamRoleMenu.deleteMany({
                    where: { teamRoleId: input.roleId },
                }),
                // 创建新关联
                ...input.menuIds.map((menuId) =>
                    db.teamRoleMenu.create({
                        data: {
                            teamRoleId: input.roleId,
                            menuId,
                        },
                    })
                ),
            ]);
            return { success: true };
        }),
});
