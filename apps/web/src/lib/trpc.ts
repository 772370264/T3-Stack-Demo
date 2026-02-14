import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "admin-service/src/routers/_app";

// tRPC Client 配置
export const trpc = createTRPCProxyClient<AppRouter>({
    links: [
        httpBatchLink({
            url: "http://localhost:4001/trpc",
        }),
    ],
});

// 导出类型
export type { AppRouter };
