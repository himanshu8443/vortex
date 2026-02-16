import { desc, eq } from "drizzle-orm";
import z from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { deployments } from "@/server/db/schema";

export const deploymentsRouter = createTRPCRouter({
	getAllDeploymentsByProjectId: protectedProcedure
		.input(z.object({ projectId: z.string() }))
		.query(async ({ input, ctx }) => {
			const projectDeployments = await ctx.db
				.select()
				.from(deployments)
				.where(eq(deployments.projectId, input.projectId))
				.orderBy(desc(deployments.startedAt));
			return projectDeployments;
		}),

	getDeploymentById: protectedProcedure
		.input(z.object({ deploymentId: z.string() }))
		.query(async ({ input, ctx }) => {
			return ctx.db
				.select()
				.from(deployments)
				.where(eq(deployments.id, input.deploymentId));
		}),
});
