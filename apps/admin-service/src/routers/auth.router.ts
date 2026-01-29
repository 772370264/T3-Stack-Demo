import { Router } from "express";
import { hash, compare } from "bcryptjs";
import { db } from "@repo/database";
import type { LoginInput, RegisterInput } from "@repo/types";

export const authRouter = Router();

// POST /api/auth/register - 用户注册
authRouter.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body as RegisterInput;

        const existingUser = await db.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ error: "该邮箱已被注册" });
        }

        const hashedPassword = await hash(password, 12);
        const user = await db.user.create({
            data: { name, email, password: hashedPassword, role: "user" },
            select: { id: true, name: true, email: true },
        });

        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({ error: "注册失败" });
    }
});

// POST /api/auth/login - 用户登录（返回用户信息，实际 JWT 由 NextAuth 处理）
authRouter.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body as LoginInput;

        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.password) {
            return res.status(401).json({ error: "邮箱或密码错误" });
        }

        const isValid = await compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: "邮箱或密码错误" });
        }

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        });
    } catch (error) {
        res.status(500).json({ error: "登录失败" });
    }
});
