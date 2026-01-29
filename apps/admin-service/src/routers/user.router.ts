import { Router } from "express";
import { hash } from "bcryptjs";
import { db } from "@repo/database";
import type { CreateUserInput, UpdateUserInput } from "@repo/types";

export const userRouter = Router();

// GET /api/users - 获取所有用户
userRouter.get("/", async (req, res) => {
    try {
        const users = await db.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                image: true,
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: "获取用户列表失败" });
    }
});

// GET /api/users/stats - 获取用户统计
userRouter.get("/stats", async (req, res) => {
    try {
        const [total, active, inactive, admins] = await Promise.all([
            db.user.count(),
            db.user.count({ where: { status: "active" } }),
            db.user.count({ where: { status: { not: "active" } } }),
            db.user.count({ where: { role: "admin" } }),
        ]);
        res.json({ total, active, inactive, admins });
    } catch (error) {
        res.status(500).json({ error: "获取统计失败" });
    }
});

// GET /api/users/:id - 获取单个用户
userRouter.get("/:id", async (req, res) => {
    try {
        const user = await db.user.findUnique({
            where: { id: req.params.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                image: true,
            },
        });
        if (!user) {
            return res.status(404).json({ error: "用户不存在" });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: "获取用户失败" });
    }
});

// POST /api/users - 创建用户
userRouter.post("/", async (req, res) => {
    try {
        const { name, email, password, role } = req.body as CreateUserInput;

        const existingUser = await db.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ error: "该邮箱已被注册" });
        }

        const hashedPassword = await hash(password, 12);
        const user = await db.user.create({
            data: { name, email, password: hashedPassword, role: role ?? "user" },
            select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
        });

        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({ error: "创建用户失败" });
    }
});

// PUT /api/users/:id - 更新用户
userRouter.put("/:id", async (req, res) => {
    try {
        const { password, ...rest } = req.body as Omit<UpdateUserInput, "id">;
        const updateData: Record<string, unknown> = { ...rest };

        if (password) {
            updateData.password = await hash(password, 12);
        }

        const user = await db.user.update({
            where: { id: req.params.id },
            data: updateData,
            select: { id: true, name: true, email: true, role: true, status: true, updatedAt: true },
        });

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: "更新用户失败" });
    }
});

// DELETE /api/users/:id - 删除用户
userRouter.delete("/:id", async (req, res) => {
    try {
        await db.user.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "删除用户失败" });
    }
});
