import { z } from "zod";
import { db } from "@repo/database";
import { router, publicProcedure } from "../trpc.js";

export const menuRouter = router({
    // 获取所有菜单（带层级，支持3级）
    getAll: publicProcedure.query(async () => {
        return await db.menu.findMany({
            where: { parentId: null },
            include: {
                children: {
                    include: {
                        children: {
                            orderBy: { sortOrder: "asc" },
                        },
                    },
                    orderBy: { sortOrder: "asc" },
                },
            },
            orderBy: { sortOrder: "asc" },
        });
    }),

    // 获取用户在特定团队下的所有可见菜单
    getUserMenus: publicProcedure
        .input(
            z.object({
                userId: z.string(),
                teamId: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            // 1. 检查是否是 系统 ADMIN
            const sysRole = await db.userSystemRole.findUnique({
                where: { userId_role: { userId: input.userId, role: "ADMIN" } },
            });

            if (sysRole) {
                // ADMIN 可以看到所有菜单
                return await db.menu.findMany({
                    where: { parentId: null },
                    include: {
                        children: {
                            include: {
                                children: {
                                    orderBy: { sortOrder: "asc" },
                                },
                            },
                            orderBy: { sortOrder: "asc" },
                        },
                    },
                    orderBy: { sortOrder: "asc" },
                });
            }

            // 2. 获取保底菜单（USER 系统角色菜单）
            const fallbackMenus = await db.systemRoleMenu.findMany({
                where: { role: "USER" },
                select: { menuId: true },
            });

            let visibleMenuIds: Set<string>;

            if (input.teamId) {
                // 有团队 → 仅使用团队角色菜单
                const member = await db.teamMember.findUnique({
                    where: {
                        userId_teamId: { userId: input.userId, teamId: input.teamId },
                    },
                    include: {
                        teamRole: {
                            include: {
                                menus: true,
                            },
                        },
                    },
                });

                const teamMenuIds = new Set<string>();
                if (member?.teamRole?.menus) {
                    member.teamRole.menus.forEach((m) => teamMenuIds.add(m.menuId));
                }

                // 如果团队角色没有配置任何菜单，回退到保底菜单
                if (teamMenuIds.size > 0) {
                    visibleMenuIds = teamMenuIds;
                } else {
                    visibleMenuIds = new Set(fallbackMenus.map((r) => r.menuId));
                }
            } else {
                // 无团队 → 使用 USER 角色保底菜单
                visibleMenuIds = new Set(fallbackMenus.map((r) => r.menuId));
            }

            // 4. 向上查找所有父级菜单，确保路径可见
            const allMenus = await db.menu.findMany(); // 获取所有菜单用于查找父级
            const initialIds = Array.from(visibleMenuIds);

            const addParents = (id: string) => {
                const menu = allMenus.find((m) => m.id === id);
                if (menu && menu.parentId) {
                    if (!visibleMenuIds.has(menu.parentId)) {
                        visibleMenuIds.add(menu.parentId);
                        addParents(menu.parentId);
                    }
                }
            };

            initialIds.forEach((id) => addParents(id));

            // 5. 查询并返回菜单树（支持3级）
            const menus = await db.menu.findMany({
                where: {
                    id: { in: Array.from(visibleMenuIds) },
                    parentId: null,
                },
                include: {
                    children: {
                        where: { id: { in: Array.from(visibleMenuIds) } },
                        include: {
                            children: {
                                where: { id: { in: Array.from(visibleMenuIds) } },
                                orderBy: { sortOrder: "asc" },
                            },
                        },
                        orderBy: { sortOrder: "asc" },
                    },
                },
                orderBy: { sortOrder: "asc" },
            });

            return menus;
        }),

    // ADMIN 配置 USER 角色的菜单
    updateUserRoleMenus: publicProcedure
        .input(
            z.object({
                menuIds: z.array(z.string()),
            })
        )
        .mutation(async ({ input }) => {
            // 事务：删除旧的，重新创建
            await db.$transaction([
                db.systemRoleMenu.deleteMany({ where: { role: "USER" } }),
                ...input.menuIds.map((menuId) =>
                    db.systemRoleMenu.create({
                        data: { role: "USER", menuId },
                    })
                ),
            ]);
            return { success: true };
        }),

    // 获取 USER 角色的菜单 ID 列表（用于回显）
    getUserRoleMenuIds: publicProcedure.query(async () => {
        const menus = await db.systemRoleMenu.findMany({
            where: { role: "USER" },
            select: { menuId: true },
        });
        return menus.map((m) => m.menuId);
    }),
});
