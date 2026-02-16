import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { deploymentsRouter } from "./routers/deployments";
import { githubRouter } from "./routers/github";
import { logsRouter } from "./routers/logs";
import { projectRouter } from "./routers/project";

import { userRouter } from "./routers/user";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
	project: projectRouter,
	logs: logsRouter,
	deployments: deploymentsRouter,
	github: githubRouter,
	user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.project.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
