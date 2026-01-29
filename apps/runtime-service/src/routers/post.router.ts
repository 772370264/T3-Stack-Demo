import { Router } from "express";
import { db } from "@repo/database";

export const postRouter = Router();

// GET /api/posts - 获取所有文章
postRouter.get("/", async (req, res) => {
    try {
        const posts = await db.post.findMany({
            include: {
                createdBy: {
                    select: { id: true, name: true, email: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: "获取文章列表失败" });
    }
});

// GET /api/posts/:id - 获取单个文章
postRouter.get("/:id", async (req, res) => {
    try {
        const post = await db.post.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                createdBy: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
        if (!post) {
            return res.status(404).json({ error: "文章不存在" });
        }
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: "获取文章失败" });
    }
});

// POST /api/posts - 创建文章
postRouter.post("/", async (req, res) => {
    try {
        const { name, createdById } = req.body;
        const post = await db.post.create({
            data: { name, createdById },
            include: {
                createdBy: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
        res.status(201).json(post);
    } catch (error) {
        res.status(500).json({ error: "创建文章失败" });
    }
});

// DELETE /api/posts/:id - 删除文章
postRouter.delete("/:id", async (req, res) => {
    try {
        await db.post.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "删除文章失败" });
    }
});
