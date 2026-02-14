import { z } from "zod";
import { db } from "@repo/database";
import { router, publicProcedure } from "../trpc.js";

export const roleRouter = router({
    // 获取团队角色列表
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
                isAdmin: z.boolean().optional(),
            })
        )
        .mutation(async ({ input }) => {
            // 检查重名
            const existing = await db.teamRole.findUnique({
                where: {
                    teamId_name: { teamId: input.teamId, name: input.name },
                },
            });
            if (existing) throw new Error("角色名称已存在");

            return await db.teamRole.create({
                data: {
                    teamId: input.teamId,
                    name: input.name,
                    isAdmin: input.isAdmin ?? false,
                },
            });
        }),

    // 更新团队角色
    update: publicProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string().min(2).optional(),
                isAdmin: z.boolean().optional(),
            })
        )
        .mutation(async ({ input }) => {
            const { id, ...data } = input;
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
