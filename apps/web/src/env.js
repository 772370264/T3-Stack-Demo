import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    // tRPC 可读模式配置：设置为 "true" 时使用标准 JSON，响应数据在开发者工具中可读
    TRPC_READABLE: z.string().optional().default("false"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // tRPC 可读模式（需要同时在客户端和服务端配置）
    NEXT_PUBLIC_TRPC_READABLE: z.string().optional().default("false"),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    TRPC_READABLE: process.env.TRPC_READABLE,
    NEXT_PUBLIC_TRPC_READABLE: process.env.NEXT_PUBLIC_TRPC_READABLE,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});

// Helper function to check if tRPC readable mode is enabled
export const isTrpcReadable = () => {
  return env.TRPC_READABLE === "true" || env.NEXT_PUBLIC_TRPC_READABLE === "true";
};
