import { type inferRouterOutputs } from "@trpc/server";
import { type AppRouter } from "../lib/trpc";

export type RouterOutputs = inferRouterOutputs<AppRouter>;
