import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { App } from "octokit";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { githubApps, projectPorts, projects } from "@/server/db/schema";
import { docker } from "@/server/docker";
import DeploymentService from "@/server/services/deployment.service";
import { calculateContainerMetrics } from "@/server/utils";

export const projectRouter = createTRPCRouter({
	// 1. Fetch all projects for the dashboard
	getAllProjects: protectedProcedure.query(async ({ ctx }) => {
		try {
			return await ctx.db
				.select()
				.from(projects)
				.orderBy(desc(projects.createdAt));
		} catch (error) {
			console.error("Failed to fetch projects list:", error);
			return [];
		}
	}),

	getProjectById: protectedProcedure
		.input(z.object({ projectId: z.string() }))
		.query(async ({ ctx, input }) => {
			const project = await ctx.db
				.select()
				.from(projects)
				.where(eq(projects.id, input.projectId))
				.limit(1)
				.then((res) => res[0]);

			if (!project)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Project not found",
				});
			const ports = await ctx.db
				.select()
				.from(projectPorts)
				.where(eq(projectPorts.projectId, input.projectId));
			return {
				success: true,
				data: { ...project, ports },
			};
		}),

	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1),
				portsData: z.array(
					z.object({
						port: z.number().int().min(1).max(65535),
						domain: z.string().url().optional().nullable(),
						exposedPort: z
							.string()
							.refine(
								(val) => {
									if (!val) return true; // Optional
									const port = parseInt(val, 10);
									return port >= 1 && port <= 65535;
								},
								{
									message: "Must be a valid port number (1-65535)",
								},
							)
							.optional()
							.nullable(),
					}),
				),
				sourceType: z.enum(["GIT", "DOCKER_REGISTRY", "MANUAL"]),
				buildType: z.enum(["DOCKERFILE", "COMPOSE", "NIXPACKS"]).optional(),

				// For DOCKER_REGISTRY
				image: z.string().optional(),
				repoUrl: z.string().optional(),
				branch: z.string().optional(),
				rootDirectory: z.string().optional(),
				githubAppId: z.string().optional(),

				// For DOCKERFILE
				dockerfilePath: z.string().optional(),
				dockerfileContent: z.string().optional(),

				// For COMPOSE
				composeFilePath: z.string().optional(),
				composeFileContent: z.string().optional(),

				// For Builder Config (Railpack/Nixpacks)
				buildConfig: z.string().optional(),
				installCommand: z.string().optional(),
				buildCommand: z.string().optional(),
				startCommand: z.string().optional(),

				// Runtime config
				envVars: z
					.array(
						z.object({
							key: z.string().min(1),
							value: z.string().min(1),
						}),
					)
					.optional(),
				cpuLimit: z.string().optional(),
				memoryLimit: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [project] = await ctx.db
				.insert(projects)
				.values({
					name: input.name,
					sourceType: input.sourceType,
					buildType: input.buildType,
					repoUrl: input.repoUrl,
					branch: input.branch,
					rootDirectory: input.rootDirectory,
					githubAppId: input.githubAppId,
					dockerfilePath: input.dockerfilePath,
					dockerfileContent: input.dockerfileContent,
					composeFilePath: input.composeFilePath,
					composeFileContent: input.composeFileContent,
					buildConfig: input.buildConfig,
					installCommand: input.installCommand,
					buildCommand: input.buildCommand,
					startCommand: input.startCommand,
					envVars: JSON.stringify(input.envVars),
					cpuLimit: input.cpuLimit,
					memoryLimit: input.memoryLimit,
					status: "STARTING",
					image: input.image,
				})
				.returning();

			if (!project) throw new Error("Failed to create project record");

			const [ports] = await ctx.db
				.insert(projectPorts)
				.values(
					input.portsData.map((portData) => ({
						projectId: project.id,
						port: portData.port,
						domain: portData.domain,
						exposedPort: portData.exposedPort
							? parseInt(portData.exposedPort, 10)
							: null,
					})),
				)
				.returning();

			if (!ports) throw new Error("Failed to create project ports");

			const deploymentService = new DeploymentService(project.id);
			const deploymentId = await deploymentService.startNewDeployment();

			return {
				success: true,
				data: { projectId: project.id, deploymentId },
			};
		}),

	updateProject: protectedProcedure
		.input(
			z.object({
				projectId: z.string(),
				repoUrl: z.string().optional(),
				branch: z.string().optional(),
				rootDirectory: z.string().optional(),
				dockerfilePath: z.string().optional(),
				installCommand: z.string().nullable().optional(),
				buildCommand: z.string().nullable().optional(),
				startCommand: z.string().nullable().optional(),
				cpuLimit: z.string().optional(),
				memoryLimit: z.string().optional(),
				buildType: z.enum(["DOCKERFILE", "COMPOSE", "NIXPACKS"]).optional(),
				name: z.string().min(1).optional(),
				portsData: z.array(
					z.object({
						port: z.number().int().min(1).max(65535),
						domain: z.string().url().optional().nullable(),
						exposedPort: z
							.string()
							.refine(
								(val) => {
									if (!val) return true; // Optional
									const port = parseInt(val, 10);
									return port >= 1 && port <= 65535;
								},
								{
									message: "Must be a valid port number (1-65535)",
								},
							)
							.optional()
							.nullable(),
					}),
				).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { projectId, ...updates } = input;

			const project = await ctx.db.query.projects.findFirst({
				where: eq(projects.id, projectId),
			});

			if (!project)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Project not found",
				});

			// Only include fields that were explicitly provided
			const setValues: Partial<typeof projects.$inferInsert> = {};
			if (updates.repoUrl !== undefined) setValues.repoUrl = updates.repoUrl;
			if (updates.branch !== undefined) setValues.branch = updates.branch;
			if (updates.rootDirectory !== undefined)
				setValues.rootDirectory = updates.rootDirectory;
			if (updates.dockerfilePath !== undefined)
				setValues.dockerfilePath = updates.dockerfilePath;
			if (updates.installCommand !== undefined)
				setValues.installCommand = updates.installCommand;
			if (updates.buildCommand !== undefined)
				setValues.buildCommand = updates.buildCommand;
			if (updates.startCommand !== undefined)
				setValues.startCommand = updates.startCommand;
			if (updates.cpuLimit !== undefined) setValues.cpuLimit = updates.cpuLimit;
			if (updates.memoryLimit !== undefined)
				setValues.memoryLimit = updates.memoryLimit;
			if (updates.buildType !== undefined)
				setValues.buildType = updates.buildType;
			if (updates.name !== undefined)
				setValues.name = updates.name;

			if (Object.keys(setValues).length > 0) {
				await ctx.db
					.update(projects)
					.set(setValues)
					.where(eq(projects.id, projectId));
			}

			if (updates.portsData !== undefined) {
				await ctx.db
					.delete(projectPorts)
					.where(eq(projectPorts.projectId, projectId));
				
				if (updates.portsData.length > 0) {
					await ctx.db
						.insert(projectPorts)
						.values(
							updates.portsData.map((portData) => ({
								projectId,
								port: portData.port,
								domain: portData.domain,
								exposedPort: portData.exposedPort
									? parseInt(portData.exposedPort, 10)
									: null,
							}))
						);
				}
			}

			return { success: true };
		}),

	fetchBranches: protectedProcedure
		.input(
			z.object({
				repoUrl: z.string(),
				githubAppId: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const repoMatch = input.repoUrl
				.trim()
				.match(/github\.com[/:]([^/]+)\/([^/.]+?)(?:\.git)?(?:\/?|#.*)$/i);

			if (repoMatch && input.githubAppId) {
				const owner = repoMatch[1];
				const repo = repoMatch[2];

				if (!owner || !repo) {
					return [];
				}

				const appConfig = await ctx.db.query.githubApps.findFirst({
					where: eq(githubApps.id, input.githubAppId),
				});

				if (appConfig) {
					try {
						const octokitApp = new App({
							appId: appConfig.appId,
							privateKey: appConfig.privateKey,
						});

						const { data: installations } = await octokitApp.octokit.request(
							"GET /app/installations",
						);

						for (const installation of installations) {
							try {
								const installationOctokit =
									await octokitApp.getInstallationOctokit(installation.id);

								const { data } = await installationOctokit.request(
									"GET /repos/{owner}/{repo}/branches",
									{ owner, repo, per_page: 100 },
								);

								const branchNames = data
									.map((branch) => branch.name)
									.filter(Boolean);

								if (branchNames.length > 0) return branchNames;
							} catch {}
						}
					} catch {
						// Fall through to git-based lookup below.
					}
				}
			}

			const { execSync } = await import("node:child_process");
			try {
				const output = execSync(
					`git ls-remote --heads ${input.repoUrl} 2>/dev/null`,
					{ timeout: 10000, encoding: "utf8" },
				);
				const branches = output
					.split("\n")
					.filter(Boolean)
					.map((line: string) => {
						const ref = line.split("\t")[1] ?? "";
						return ref.replace("refs/heads/", "");
					})
					.filter(Boolean);
				return branches;
			} catch {
				return [];
			}
		}),

	redeploy: protectedProcedure
		.input(z.object({ projectId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const project = await ctx.db.query.projects.findFirst({
				where: eq(projects.id, input.projectId),
			});

			if (!project)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Project not found",
				});

			const deploymentService = new DeploymentService(project.id);
			const deploymentId =
				await deploymentService.startNewDeployment("redeploy");

			return { success: true, data: { deploymentId } };
		}),

	restart: protectedProcedure
		.input(z.object({ projectId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const project = await ctx.db.query.projects.findFirst({
				where: eq(projects.id, input.projectId),
			});

			if (!project)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Project not found",
				});

			if (!project.containerId)
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Container not running",
				});

			try {
				const container = docker.getContainer(project.containerId);
				await container.restart();
			} catch (err) {
				console.error(
					`Failed to restart container ${project.containerId}:`,
					err,
				);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to restart container",
				});
			}

			return { success: true };
		}),

	streamMetrics: protectedProcedure
		.input(z.object({ projectId: z.string() }))
		.subscription(async function* ({ ctx, input, signal }) {
			const project = await ctx.db.query.projects.findFirst({
				where: eq(projects.id, input.projectId),
			});

			if (!project?.containerId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Container not running",
				});
			}

			const container = docker.getContainer(project.containerId);

			// Get the raw stats stream
			const statsStream = await container.stats({ stream: true });

			try {
				for await (const chunk of statsStream) {
					if (signal?.aborted) break;

					// Docker sends a JSON object per line
					const stats = JSON.parse(chunk.toString());

					// Calculate human-readable numbers
					const metrics = calculateContainerMetrics(stats);

					yield metrics;
				}
			} catch (_err) {
				// Stats stream closed or container died
			} finally {
				// Force cleanup
				if (statsStream && "destroy" in statsStream)
					(statsStream as { destroy: () => void }).destroy();
			}
		}),

	deleteProject: protectedProcedure
		.input(z.object({ projectId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const project = await ctx.db.query.projects.findFirst({
				where: eq(projects.id, input.projectId),
			});

			if (!project)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Project not found",
				});

			if (project.containerId) {
				try {
					const container = docker.getContainer(project.containerId);
					await container.stop();
					await container.remove();
				} catch (err) {
					console.error(
						`Failed to stop/remove container ${project.containerId}:`,
						err,
					);
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Failed to stop running container",
					});
				}
			}

			await ctx.db.delete(projects).where(eq(projects.id, input.projectId));
		}),

	// for polling metrics on the dashboard
	getAllMetrics: protectedProcedure.query(async ({ ctx }) => {
		// 1. Get all running projects
		const runningProjects = await ctx.db.query.projects.findMany({
			where: eq(projects.status, "RUNNING"),
			columns: { id: true, containerId: true },
		});

		const statsPromises = runningProjects.map(async (p) => {
			try {
				if (!p.containerId) throw new Error("No container ID");
				const container = docker.getContainer(p.containerId);
				// Get stats ONCE (stream: false)
				const stats = await container.stats({ stream: false });
				return {
					projectId: p.id,
					metrics: calculateContainerMetrics(stats),
				};
			} catch (_e) {
				return {
					projectId: p.id,
					metrics: { cpu: "0", memory: 0, memoryLimit: 0, memoryPercent: "0" },
				};
			}
		});

		return Promise.all(statsPromises);
	}),

	getHostResources: protectedProcedure.query(async () => {
		const os = await import("node:os");
		const cpuCount = os.cpus().length;
		const totalMemoryBytes = os.totalmem();
		return { cpuCount, totalMemoryBytes };
	}),
});
