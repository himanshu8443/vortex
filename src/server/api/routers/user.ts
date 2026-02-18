import { count, eq } from "drizzle-orm";
import { z } from "zod";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "@/server/api/trpc";
import { user } from "@/server/db/schema";
import { DomainService } from "@/server/services/domain.service";

export const userRouter = createTRPCRouter({
	userCount: publicProcedure.query(async ({ ctx }) => {
		const [result] = await ctx.db.select({ count: count() }).from(user);
		return result?.count ?? 0;
	}),

	getProfile: protectedProcedure.query(async ({ ctx }) => {
		return ctx.db.query.user.findFirst({
			where: eq(user.id, ctx.session.user.id),
			columns: {
				name: true,
				email: true,
				wildcardDomain: true,
				vortexDomain: true,
				image: true,
			},
		});
	}),

	updateProfile: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1),
				email: z.string().email(),
				wildcardDomain: z.string().url().optional(),
				vortexDomain: z.string().url().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (input.vortexDomain) {
				const domainService = new DomainService();
				await domainService.updateDashboardDomain(input.vortexDomain);
			}
			await ctx.db
				.update(user)
				.set({
					name: input.name,
					email: input.email,
					wildcardDomain: input.wildcardDomain,
					vortexDomain: input.vortexDomain,
				})
				.where(eq(user.id, ctx.session.user.id));
		}),
});
