import { Router } from "express";

export const taskRouter = Router();

// 模拟任务列表
const tasks: { id: string; name: string; status: string; createdAt: Date }[] = [];

// GET /api/tasks - 获取任务列表
taskRouter.get("/", (req, res) => {
    res.json(tasks);
});

// POST /api/tasks - 创建任务
taskRouter.post("/", (req, res) => {
    const { name } = req.body;
    const task = {
        id: crypto.randomUUID(),
        name,
        status: "pending",
        createdAt: new Date(),
    };
    tasks.push(task);
    res.status(201).json(task);
});

// POST /api/tasks/:id/run - 执行任务
taskRouter.post("/:id/run", (req, res) => {
    const task = tasks.find((t) => t.id === req.params.id);
    if (!task) {
        return res.status(404).json({ error: "任务不存在" });
    }
    task.status = "running";

    // 模拟任务执行
    setTimeout(() => {
        task.status = "completed";
    }, 3000);

    res.json({ message: "任务已开始执行", task });
});

// DELETE /api/tasks/:id - 删除任务
taskRouter.delete("/:id", (req, res) => {
    const index = tasks.findIndex((t) => t.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ error: "任务不存在" });
    }
    tasks.splice(index, 1);
    res.json({ success: true });
});
