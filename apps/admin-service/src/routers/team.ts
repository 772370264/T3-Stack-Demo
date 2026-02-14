import { z } from "zod";
import { db } from "@repo/database";
import { router, publicProcedure } from "../trpc.js";

// ========== 辅助函数 ==========

/** 检查用户是否为系统管理员 */
async function isSystemAdmin(userId: string): Promise<boolean> {
    const adminRole = await db.userSystemRole.findUnique({
        where: { userId_role: { userId, role: "ADMIN" } },
    });
    return !!adminRole;
}

/** 检查用户是否为指定团队的管理员 */
async function isTeamAdmin(userId: string, teamId: string): Promise<boolean> {
    const member = await db.teamMember.findUnique({
        where: { userId_teamId: { userId, teamId } },
        include: { teamRole: { select: { isAdmin: true } } },
    });
    return member?.teamRole?.isAdmin === true;
}

/** 检查用户是否为指定团队或其任意祖先团队的管理员 */
async function isTeamOrAncestorAdmin(userId: string, teamId: string): Promise<boolean> {
    // 先检查当前团队
    if (await isTeamAdmin(userId, teamId)) return true;
    // 沿祖先链向上查找
    const team = await db.team.findUnique({
        where: { id: teamId },
        select: { parentId: true },
    });
    if (team?.parentId) {
        return isTeamOrAncestorAdmin(userId, team.parentId);
    }
    return false;
}

// 团队路由
export const teamRouter = router({
    // 获取所有团队（按权限过滤）
    // ADMIN 系统角色：返回全部；普通用户：返回所在团队
    getAll: publicProcedure
        .input(z.object({
            userId: z.string().optional(),
            flat: z.boolean().optional(),
        }).optional())
        .query(async ({ input }) => {
            const userId = input?.userId;

            // 无 userId 或系统管理员 => 返回所有
            if (!userId || await isSystemAdmin(userId)) {
                const teams = await db.team.findMany({
                    include: {
                        parent: { select: { id: true, name: true } },
                        _count: { select: { members: true, children: true } },
                    },
                    orderBy: { createdAt: "desc" },
                });
                return teams;
            }

            // 普通用户：只返回所在团队及其子团队
            const memberTeamIds = await db.teamMember.findMany({
                where: { userId },
                select: { teamId: true },
            });
            const teamIds = memberTeamIds.map((m) => m.teamId);

            const allTeamIds = new Set(teamIds);

            // 递归查找所有子团队
            async function addDescendants(parentIds: string[]) {
                if (parentIds.length === 0) return;
                const children = await db.team.findMany({
                    where: { parentId: { in: parentIds } },
                    select: { id: true },
                });
                const newIds = children.map((c) => c.id).filter((id) => !allTeamIds.has(id));
                for (const id of newIds) {
                    allTeamIds.add(id);
                }
                if (newIds.length > 0) {
                    await addDescendants(newIds);
                }
            }

            await addDescendants(teamIds);

            const teams = await db.team.findMany({
                where: { id: { in: Array.from(allTeamIds) } },
                include: {
                    parent: { select: { id: true, name: true } },
                    _count: { select: { members: true, children: true } },
                },
                orderBy: { createdAt: "desc" },
            });
            return teams;
        }),

    // 获取团队树
    getTree: publicProcedure.query(async () => {
        const teams = await db.team.findMany({
            where: { parentId: null },
            include: {
                children: {
                    include: {
                        children: true,
                        _count: { select: { members: true } },
                    },
                },
                _count: { select: { members: true, children: true } },
            },
        });
        return teams;
    }),

    // 获取单个团队
    getById: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input }) => {
            const team = await db.team.findUnique({
                where: { id: input.id },
                include: {
                    parent: { select: { id: true, name: true } },
                    children: {
                        include: { _count: { select: { members: true } } },
                    },
                    members: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    image: true,
                                    status: true,
                                },
                            },
                            teamRole: {
                                select: { id: true, name: true, isAdmin: true },
                            },
                        },
                    },
                    _count: { select: { members: true, children: true } },
                    roles: true,
                },
            });
            if (!team) throw new Error("团队不存在");
            return team;
        }),

    // 创建团队（仅父团队管理员或系统管理员可创建子团队）
    create: publicProcedure
        .input(
            z.object({
                name: z.string().min(2),
                description: z.string().optional(),
                parentId: z.string().optional(),
                operatorId: z.string(), // 操作者用户 ID
            })
        )
        .mutation(async ({ input }) => {
            const parentId = input.parentId || "admin-team";

            // 验证父团队是否存在
            const parent = await db.team.findUnique({
                where: { id: parentId },
            });
            if (!parent) throw new Error("父团队不存在");

            // 权限校验：系统管理员或父团队管理员才能创建子团队
            const sysAdmin = await isSystemAdmin(input.operatorId);
            if (!sysAdmin) {
                const teamAdmin = await isTeamOrAncestorAdmin(input.operatorId, parentId);
                if (!teamAdmin) {
                    throw new Error("只有团队管理员可以创建子团队");
                }
            }

            const team = await db.team.create({
                data: {
                    name: input.name,
                    description: input.description,
                    parentId: parentId,
                },
                include: {
                    parent: { select: { id: true, name: true } },
                    _count: { select: { members: true, children: true } },
                },
            });

            // 自动创建默认管理员角色
            await db.teamRole.create({
                data: {
                    name: "团队管理员",
                    teamId: team.id,
                    isAdmin: true,
                },
            });

            // 创建默认开发者角色
            await db.teamRole.create({
                data: {
                    name: "开发者",
                    teamId: team.id,
                    isAdmin: false,
                },
            });

            return team;
        }),

    // 更新团队
    update: publicProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string().min(2).optional(),
                description: z.string().optional(),
                parentId: z.string().nullable().optional(),
            })
        )
        .mutation(async ({ input }) => {
            const { id, parentId, ...rest } = input;

            // 防止循环引用
            if (parentId === id) throw new Error("不能将自己设为父团队");

            return await db.team.update({
                where: { id },
                data: {
                    ...rest,
                    parentId: parentId === null ? null : parentId,
                },
            });
        }),

    // 删除团队
    delete: publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
            if (input.id === "admin-team") {
                throw new Error("系统管理根团队不可删除");
            }

            // 检查是否有子团队
            const childCount = await db.team.count({
                where: { parentId: input.id },
            });
            if (childCount > 0) throw new Error("请先删除子团队");

            await db.$transaction([
                db.teamMember.deleteMany({ where: { teamId: input.id } }),
                db.teamRole.deleteMany({ where: { teamId: input.id } }),
                db.team.delete({ where: { id: input.id } }),
            ]);
            return { success: true };
        }),

    // 获取团队成员
    getMembers: publicProcedure
        .input(z.object({ teamId: z.string() }))
        .query(async ({ input }) => {
            return await db.teamMember.findMany({
                where: { teamId: input.teamId },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true,
                            status: true,
                        },
                    },
                    teamRole: {
                        select: { id: true, name: true, isAdmin: true },
                    },
                },
            });
        }),

    // 添加成员（仅团队管理员或系统管理员可操作）
    addMember: publicProcedure
        .input(
            z.object({
                teamId: z.string(),
                userId: z.string(),
                teamRoleId: z.string(),
                operatorId: z.string(), // 操作者用户 ID
            })
        )
        .mutation(async ({ input }) => {
            // 权限校验
            const sysAdmin = await isSystemAdmin(input.operatorId);
            if (!sysAdmin) {
                const teamAdmin = await isTeamOrAncestorAdmin(input.operatorId, input.teamId);
                if (!teamAdmin) {
                    throw new Error("只有团队管理员可以添加成员");
                }
            }

            // 检查是否已是成员
            const existing = await db.teamMember.findUnique({
                where: {
                    userId_teamId: { userId: input.userId, teamId: input.teamId },
                },
            });
            if (existing) throw new Error("该用户已是团队成员");

            return await db.teamMember.create({
                data: {
                    userId: input.userId,
                    teamId: input.teamId,
                    teamRoleId: input.teamRoleId,
                },
                include: {
                    user: {
                        select: { id: true, name: true, email: true, image: true },
                    },
                    teamRole: true,
                },
            });
        }),

    // 更新成员角色（仅团队管理员可操作，且不能修改其他管理员的角色）
    updateMemberRole: publicProcedure
        .input(
            z.object({
                teamId: z.string(),
                userId: z.string(),
                teamRoleId: z.string(),
                operatorId: z.string(), // 操作者用户 ID
            })
        )
        .mutation(async ({ input }) => {
            // 权限校验
            const sysAdmin = await isSystemAdmin(input.operatorId);
            if (!sysAdmin) {
                const teamAdmin = await isTeamOrAncestorAdmin(input.operatorId, input.teamId);
                if (!teamAdmin) {
                    throw new Error("只有团队管理员可以修改成员角色");
                }
            }

            // 检查目标成员是否是管理员（管理员不能修改管理员角色）
            const targetMember = await db.teamMember.findUnique({
                where: {
                    userId_teamId: { userId: input.userId, teamId: input.teamId },
                },
                include: { teamRole: { select: { isAdmin: true } } },
            });

            if (targetMember?.teamRole?.isAdmin) {
                throw new Error("无法修改团队管理员的角色");
            }

            return await db.teamMember.update({
                where: {
                    userId_teamId: { userId: input.userId, teamId: input.teamId },
                },
                data: { teamRoleId: input.teamRoleId },
            });
        }),

    // 移除成员（仅团队管理员或系统管理员可操作）
    removeMember: publicProcedure
        .input(
            z.object({
                teamId: z.string(),
                userId: z.string(),
                operatorId: z.string(), // 操作者用户 ID
            })
        )
        .mutation(async ({ input }) => {
            // 权限校验
            const sysAdmin = await isSystemAdmin(input.operatorId);
            if (!sysAdmin) {
                const teamAdmin = await isTeamOrAncestorAdmin(input.operatorId, input.teamId);
                if (!teamAdmin) {
                    throw new Error("只有团队管理员可以移除成员");
                }
            }

            await db.teamMember.delete({
                where: {
                    userId_teamId: { userId: input.userId, teamId: input.teamId },
                },
            });
            return { success: true };
        }),

    // 获取用户所属的所有团队（用于切换团队）
    getUserTeams: publicProcedure
        .input(z.object({ userId: z.string() }))
        .query(async ({ input }) => {
            const members = await db.teamMember.findMany({
                where: { userId: input.userId },
                include: {
                    team: {
                        select: { id: true, name: true },
                    },
                    teamRole: {
                        select: { id: true, name: true, isAdmin: true },
                    },
                },
                orderBy: { team: { name: "asc" } },
            });

            return members.map((m) => ({
                id: m.team.id,
                name: m.team.name,
                teamRole: m.teamRole.name,
                isAdmin: m.teamRole.isAdmin,
            }));
        }),
});

export type TeamRouter = typeof teamRouter;
