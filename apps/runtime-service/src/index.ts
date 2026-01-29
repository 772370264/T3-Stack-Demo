import express from "express";
import cors from "cors";
import { postRouter } from "./routers/post.router.js";
import { taskRouter } from "./routers/task.router.js";

const app = express();
const PORT = process.env.PORT ?? 4002;

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查
app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "runtime-service" });
});

// 路由
app.use("/api/posts", postRouter);
app.use("/api/tasks", taskRouter);

// 启动服务
app.listen(PORT, () => {
    console.log(`⚙️ Runtime Service running on http://localhost:${PORT}`);
});
