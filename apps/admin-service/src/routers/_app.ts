import { router } from "../trpc.js";
import { userRouter } from "./user.js";
import { teamRouter } from "./team.js";
import { menuRouter } from "./menu.js";
import { roleRouter } from "./role.js";

// 根路由 - 合并所有子路由
export const appRouter = router({
    user: userRouter,
    team: teamRouter,
    menu: menuRouter,
    role: roleRouter,
});

// 导出类型供前端使用
export type AppRouter = typeof appRouter;
