import express from "express";
import cors from "cors";
import { userRouter } from "./routers/user.router.js";
import { authRouter } from "./routers/auth.router.js";

const app = express();
const PORT = process.env.PORT ?? 4001;

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查
app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "admin-service" });
});

// 路由
app.use("/api/users", userRouter);
app.use("/api/auth", authRouter);

// 启动服务
app.listen(PORT, () => {
    console.log(`🔧 Admin Service running on http://localhost:${PORT}`);
});
