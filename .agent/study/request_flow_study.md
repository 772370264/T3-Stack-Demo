# tRPC 请求流程学习笔记

> 以 `user.getAll` 为例，梳理完整调用链路

---

## 1. 完整调用链路

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           前端 (web)                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  admin/users/page.tsx                                                   │
│                                                                         │
│  const users = await trpc.user.getAll.query();                          │
│                       │    │      │      │                              │
│                       │    │      │      └── 执行查询                    │
│                       │    │      └── 方法名                             │
│                       │    └── 子路由名                                  │
│                       └── tRPC 客户端                                    │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                │  HTTP POST /trpc/user.getAll
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        后端 (admin-service)                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ① index.ts - Express 接收请求                                           │
│     app.use("/trpc", createExpressMiddleware({                          │
│         router: appRouter,                                              │
│         createContext,  ──────────────────────────────────┐             │
│     }))                                                   │             │
│                                                           │             │
│  ② trpc.ts - 创建上下文（每个请求调用一次）                  │             │
│     createContext = (opts) => {                    ◄──────┘             │
│         return { req: opts.req, res: opts.res };                        │
│     }                                                                   │
│                                                                         │
│  ③ routers/_app.ts - 路由分发                                           │
│     appRouter = router({                                                │
│         user: userRouter,  ◄── 匹配 "user"                               │
│         team: teamRouter,                                               │
│     })                                                                  │
│                                                                         │
│  ④ routers/user.ts - 执行业务逻辑                                        │
│     userRouter = router({                                               │
│         getAll: publicProcedure.query(async () => {  ◄── 匹配 "getAll"   │
│             return await db.user.findMany({...});                       │
│         }),                                                             │
│     })                                                                  │
│                                                                         │
│  ⑤ @repo/database - 数据库查询                                           │
│     db.user.findMany({...})  ──► Prisma ──► SQLite                      │
│                                                                         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                │  JSON 响应
                                ▼
                           返回用户列表
```

---

## 2. 各文件/方法详解

### 2.1 前端：`web/src/lib/trpc.ts`

```typescript
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "admin-service/src/routers/_app";

export const trpc = createTRPCProxyClient<AppRouter>({
    links: [
        httpBatchLink({
            url: "http://localhost:4001/trpc",
        }),
    ],
});
```

| 代码 | 作用 |
|-----|------|
| `createTRPCProxyClient<AppRouter>` | 创建类型安全的客户端，泛型传入后端类型 |
| `httpBatchLink` | 使用 HTTP 批量请求链接 |
| `url` | 后端 tRPC 端点地址 |

---

### 2.2 前端调用：`web/src/app/admin/users/page.tsx`

```typescript
import { trpc } from "~/lib/trpc";

const users = await trpc.user.getAll.query();
```

| 代码 | 作用 |
|-----|------|
| `trpc` | tRPC 客户端实例 |
| `.user` | 访问 user 子路由（对应后端 `appRouter.user`） |
| `.getAll` | 访问 getAll 方法（对应后端 `userRouter.getAll`） |
| `.query()` | 执行查询请求（GET 语义） |

---

### 2.3 后端入口：`admin-service/src/index.ts`

```typescript
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers/_app.js";
import { createContext } from "./trpc.js";

app.use(
    "/trpc",
    createExpressMiddleware({
        router: appRouter,
        createContext,
    })
);
```

| 代码 | 作用 |
|-----|------|
| `createExpressMiddleware` | tRPC 的 Express 适配器 |
| `"/trpc"` | 挂载路径，所有 `/trpc/*` 请求由 tRPC 处理 |
| `router: appRouter` | 注册路由，处理请求分发 |
| `createContext` | **回调函数**，每个请求调用一次创建上下文 |

---

### 2.4 tRPC 初始化：`admin-service/src/trpc.ts`

```typescript
import { initTRPC } from "@trpc/server";
import type { Request, Response } from "express";

// 上下文类型定义
export interface CreateContextOptions {
    req: Request;
    res: Response;
}

// 上下文工厂函数（每个请求调用）
export const createContext = (opts: CreateContextOptions) => {
    return {
        req: opts.req,
        res: opts.res,
    };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

// 初始化 tRPC
const t = initTRPC.context<Context>().create();

// 导出工具
export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
```

| 代码 | 作用 |
|-----|------|
| `CreateContextOptions` | 定义 createContext 的入参类型 |
| `createContext` | 回调函数，tRPC 每个请求时调用并传入 `{req, res}` |
| `initTRPC.context<Context>().create()` | 初始化 tRPC 实例，绑定上下文类型 |
| `router` | 创建路由组的工具函数 |
| `publicProcedure` | 创建公开接口的工具（无需认证） |

---

### 2.5 根路由：`admin-service/src/routers/_app.ts`

```typescript
import { router } from "../trpc.js";
import { userRouter } from "./user.js";
import { teamRouter } from "./team.js";

export const appRouter = router({
    user: userRouter,   // 👈 "user" 决定前端调用 trpc.user.xxx
    team: teamRouter,   // 👈 "team" 决定前端调用 trpc.team.xxx
});

export type AppRouter = typeof appRouter;
```

| 代码 | 作用 |
|-----|------|
| `router({...})` | 创建路由组，合并子路由 |
| `user: userRouter` | 键名 `user` 决定前端调用路径 |
| `AppRouter` | 导出类型，供前端获取类型推断 |

---

### 2.6 用户路由：`admin-service/src/routers/user.ts`

```typescript
import { z } from "zod";
import { db } from "@repo/database";
import { router, publicProcedure } from "../trpc.js";

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
});
```

| 代码 | 作用 |
|-----|------|
| `router({...})` | 创建用户相关的路由组 |
| `getAll` | 方法名，决定前端调用 `trpc.user.getAll` |
| `publicProcedure` | 公开接口，无需认证 |
| `.query(async () => {...})` | 定义查询操作（GET 语义），返回数据 |
| `db.user.findMany({...})` | Prisma 数据库查询 |

---

## 3. 关键概念

### 3.1 `publicProcedure` vs `protectedProcedure`

```typescript
// 公开接口 - 无需认证
getAll: publicProcedure.query(...)

// 受保护接口 - 需要登录（未来扩展）
getProfile: protectedProcedure.query(({ ctx }) => {
    return ctx.user;  // 从上下文获取当前用户
})
```

### 3.2 `.query()` vs `.mutation()`

| 方法 | 语义 | 类比 HTTP |
|-----|------|----------|
| `.query()` | 查询数据，不修改 | GET |
| `.mutation()` | 修改数据 | POST/PUT/DELETE |

### 3.3 回调函数传递

```typescript
// 传递函数引用（回调）
createExpressMiddleware({ createContext })

// 不是立即调用
createExpressMiddleware({ createContext() })  // ❌ 错误
```

---

## 4. 类型安全原理

```
后端定义类型
     │
     ▼
export type AppRouter = typeof appRouter
     │
     ▼
前端导入类型
import type { AppRouter } from "admin-service/..."
     │
     ▼
createTRPCProxyClient<AppRouter>()
     │
     ▼
TypeScript 自动推断
trpc.user.getAll.query() 返回类型 = User[]
```

**核心：** 前后端共享同一份类型定义，实现端到端类型安全。
