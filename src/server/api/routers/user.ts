import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { user } from "@/server/db/schema";
import { count, eq } from "drizzle-orm";
import { z } from "zod";

export const userRouter = createTRPCRouter({
	userCount: publicProcedure.query(async ({ ctx }) => {
		const [result] = await ctx.db.select({ count: count() }).from(user);
		return result?.count ?? 0;
	}),

	getProfile: protectedProcedure
		.query(async ({ ctx }) => {
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
				wildcardDomain: z.string().optional(),
				vortexDomain: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
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
