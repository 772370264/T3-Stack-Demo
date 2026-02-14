import { z } from "zod";
import { hash } from "bcryptjs";
import { db } from "@repo/database";
import { router, publicProcedure } from "../trpc.js";

// 系统角色常量
const SYSTEM_ROLES = ["ADMIN", "USER"] as const;

// 用户路由
export const userRouter = router({
    // 获取所有用户
    getAll: publicProcedure.query(async () => {
        return await db.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                image: true,
                systemRoles: {
                    select: { id: true, role: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }),

    // 获取用户统计
    getStats: publicProcedure.query(async () => {
        const [total, active, inactive] = await Promise.all([
            db.user.count(),
            db.user.count({ where: { status: "active" } }),
            db.user.count({ where: { status: { not: "active" } } }),
        ]);
        return { total, active, inactive };
    }),

    // 获取单个用户
    getById: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input }) => {
            const user = await db.user.findUnique({
                where: { id: input.id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    image: true,
                    systemRoles: {
                        select: { id: true, role: true },
                    },
                },
            });
            if (!user) throw new Error("用户不存在");
            return user;
        }),

    // 创建用户
    create: publicProcedure
        .input(
            z.object({
                name: z.string().min(2),
                email: z.string().email(),
                password: z.string().min(6),
            })
        )
        .mutation(async ({ input }) => {
            const existingUser = await db.user.findUnique({
                where: { email: input.email },
            });
            if (existingUser) throw new Error("该邮箱已被注册");

            const hashedPassword = await hash(input.password, 12);
            const user = await db.user.create({
                data: {
                    name: input.name,
                    email: input.email,
                    password: hashedPassword,
                    status: "active",
                },
            });

            // 添加默认 USER 角色
            await db.userSystemRole.create({
                data: { userId: user.id, role: "USER" },
            });

            return user;
        }),

    // 更新用户
    update: publicProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string().min(2).optional(),
                email: z.string().email().optional(),
                password: z.string().min(6).optional(),
                status: z.string().optional(),
            })
        )
        .mutation(async ({ input }) => {
            const { id, password, ...rest } = input;
            const updateData: Record<string, unknown> = { ...rest };

            if (password) {
                updateData.password = await hash(password, 12);
            }

            return await db.user.update({
                where: { id },
                data: updateData,
            });
        }),

    // 删除用户
    delete: publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
            await db.user.delete({ where: { id: input.id } });
            return { success: true };
        }),

});

export type UserRouter = typeof userRouter;
