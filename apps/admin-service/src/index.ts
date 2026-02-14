import "dotenv/config";
import express from "express";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers/_app.js";
import { createContext } from "./trpc.js";

const app = express();
const PORT = process.env.PORT ?? 4001;

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查
app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "admin-service" });
});

// tRPC 路由
app.use(
    "/trpc",
    createExpressMiddleware({
        router: appRouter,
        createContext,
    })
);

// 启动服务
app.listen(PORT, () => {
    console.log(`🔧 Admin Service (tRPC) running on http://localhost:${PORT}`);
    console.log(`   tRPC endpoint: http://localhost:${PORT}/trpc`);
});

// 导出类型
export type { AppRouter } from "./routers/_app.js";
