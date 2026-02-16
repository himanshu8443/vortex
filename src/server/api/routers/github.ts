import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { App } from "octokit";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { githubApps } from "@/server/db/schema";

export const githubRouter = createTRPCRouter({
	/** List all connected GitHub Apps. */
	listApps: protectedProcedure.query(async ({ ctx }) => {
		return ctx.db.select().from(githubApps);
	}),

	/** List repositories for a specific GitHub App installation. */
	listRepos: protectedProcedure
		.input(z.object({ githubAppId: z.string() }))
		.query(async ({ ctx, input }) => {
			const app = await ctx.db.query.githubApps.findFirst({
				where: eq(githubApps.id, input.githubAppId),
			});

			if (!app) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "GitHub App configuration not found",
				});
			}

			try {
				const octokitApp = new App({
					appId: app.appId,
					privateKey: app.privateKey,
				});

				// Get installations for this app (should be one for private apps)
				const { data: installations } = await octokitApp.octokit.request(
					"GET /app/installations",
				);

				if (installations.length === 0 || !installations[0]) {
					const installUrl = app.htmlUrl
						? `${app.htmlUrl}/installations/new`
						: null;

					throw new TRPCError({
						code: "PRECONDITION_FAILED",
						message: installUrl
							? `GitHub App is connected but not installed. Install it first: ${installUrl}`
							: "GitHub App is connected but not installed. Install it on your GitHub account first.",
					});
				}

				// Use the first installation found
				const installationId = installations[0].id;
				const installationOctokit =
					await octokitApp.getInstallationOctokit(installationId);

				// List accessible repositories
				const { data: repos } = await installationOctokit.request(
					"GET /installation/repositories",
					{
						per_page: 100,
					},
				);

				return repos.repositories.map((repo) => ({
					id: repo.id,
					name: repo.name,
					full_name: repo.full_name,
					html_url: repo.html_url,
					default_branch: repo.default_branch,
					private: repo.private,
				}));
			} catch (error) {
				if (error instanceof TRPCError) {
					throw error;
				}

				console.error("Failed to fetch GitHub repos:", error);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to fetch repositories from GitHub",
					cause: error,
				});
			}
		}),

	/** Remove a GitHub App integration. */
	deleteApp: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db.delete(githubApps).where(eq(githubApps.id, input.id));
			return { success: true };
		}),
});
