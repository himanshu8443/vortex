import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { user } from "@/server/db/schema";
import { count } from "drizzle-orm";

export const userRouter = createTRPCRouter({
	userCount: publicProcedure.query(async ({ ctx }) => {
		const [result] = await ctx.db.select({ count: count() }).from(user);
		return result?.count ?? 0;
	}),
});
