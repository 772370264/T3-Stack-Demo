import { initTRPC } from "@trpc/server";
import type { Request, Response } from "express";

// Context 类型
export interface CreateContextOptions {
    req: Request;
    res: Response;
}

// 创建 context
export const createContext = (opts: CreateContextOptions) => {
    return {
        req: opts.req,
        res: opts.res,
    };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

// 初始化 tRPC
const t = initTRPC.context<Context>().create();

// 导出
export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
