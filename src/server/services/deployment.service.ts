import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { deployments, projectPorts, projects } from "@/server/db/schema";
import { eventBus } from "@/server/event-bus";
import { docker } from "../docker";
import { createContainer } from "../docker.helpers";
import { getInstallationToken } from "../utils";

type Project = typeof projects.$inferSelect;

class DeploymentService {
	private readonly projectId: string;
	private project: Project | null = null;

	constructor(projectId: string) {
		this.projectId = projectId;
	}

	async getProjectFromDb(): Promise<Project> {
		const [project] = await db
			.select()
			.from(projects)
			.where(eq(projects.id, this.projectId))
			.limit(1);

		if (!project) {
			throw new Error(`Project not found: ${this.projectId}`);
		}

		this.project = project;
		return project;
	}

	getProject(): Project | null {
		return this.project;
	}

	private async appendBuildLog(deploymentId: string, chunk: string) {
		await db
			.update(deployments)
			.set({
				buildLogs: sql`coalesce(${deployments.buildLogs}, '') || ${chunk}`,
			})
			.where(eq(deployments.id, deploymentId));
		eventBus.emit(`logs:${deploymentId}`, chunk);
	}

	private runProcess(
		command: string,
		args: string[],
		options?: {
			cwd?: string;
			onData?: (chunk: string) => void;
			env?: Record<string, string | undefined>;
		},
	): Promise<number> {
		return new Promise((resolve, reject) => {
			const child = spawn(command, args, {
				cwd: options?.cwd,
				env: { ...process.env, ...(options?.env ?? {}) },
				stdio: ["ignore", "pipe", "pipe"],
			});

			child.on("error", reject);

			child.stdout.on("data", (data) => {
				options?.onData?.(data.toString());
			});

			child.stderr.on("data", (data) => {
				options?.onData?.(data.toString());
			});

			child.on("close", (code) => {
				resolve(code ?? 1);
			});
		});
	}

	/** Run a command and return its stdout as a trimmed string. */
	private runCapture(
		command: string,
		args: string[],
		cwd: string,
	): Promise<string> {
		return new Promise((resolve, reject) => {
			const child = spawn(command, args, {
				cwd,
				stdio: ["ignore", "pipe", "pipe"],
			});
			let stdout = "";
			child.stdout.on("data", (d) => {
				stdout += d.toString();
			});
			child.on("error", reject);
			child.on("close", () => resolve(stdout.trim()));
		});
	}

	private getImageName(project: Project): string {
		return `vortex-${project.name}:latest`;
	}

	private getContainerName(projectName: string, deploymentId: string): string {
		return `vortex-${projectName}-${deploymentId}`;
	}

	private async ensureLocalBuildkit(deploymentId: string): Promise<string> {
		// 1. If Production (Env var is set), just use it.
		if (process.env.BUILDKIT_HOST) {
			return process.env.BUILDKIT_HOST;
		}

		// 2. If Local Dev, we must ensure the container exists.
		const containerName = "vortex-buildkit";
		const port = "1234";

		try {
			// Check if it's already running
			const containers = await docker.listContainers({
				all: true,
				filters: { name: [containerName] },
			});

			const existing = containers[0];

			if (existing) {
				if (existing.State === "running") {
					// It's running, just use it
					return `tcp://127.0.0.1:${port}`;
				} else {
					// It exists but stopped, start it
					await this.appendBuildLog(
						deploymentId,
						`[buildkit] Starting existing BuildKit daemon...\n`,
					);
					await docker.getContainer(existing.Id).start();
					await new Promise((r) => setTimeout(r, 2000)); // Give it 2s to wake up
					return `tcp://127.0.0.1:${port}`;
				}
			}

			// 3. Not found? Create it.
			await this.appendBuildLog(
				deploymentId,
				`[buildkit] Spawning new BuildKit daemon (vortex-buildkit)...\n`,
			);

			// Pull image first (silent)
			await docker.pull("moby/buildkit:latest");

			const container = await docker.createContainer({
				Image: "moby/buildkit:latest",
				name: containerName,
				ExposedPorts: { "1234/tcp": {} },
				HostConfig: {
					Privileged: true, // Required for BuildKit
					PortBindings: { "1234/tcp": [{ HostPort: port }] },
					RestartPolicy: { Name: "unless-stopped" },
				},
				Cmd: ["--addr", "tcp://0.0.0.0:1234"],
			});

			await container.start();
			await this.appendBuildLog(
				deploymentId,
				`[buildkit] Daemon started on port ${port}.\n`,
			);

			// Wait for boot
			await new Promise((r) => setTimeout(r, 3000));

			return `tcp://127.0.0.1:${port}`;
		} catch (error) {
			console.error("Failed to ensure local buildkit:", error);
			throw new Error(
				"Could not start local BuildKit daemon. Make sure Docker Desktop is running.",
			);
		}
	}

	private async buildFromGitWithRailpack(
		deploymentId: string,
		repoUrl: string,
		branch: string | null,
		rootDirectory: string,
		imageName: string,
		commitHash?: string,
	): Promise<{ commitHash: string; commitMessage: string }> {
		const tempRoot = await mkdtemp(join(tmpdir(), "vortex-railpack-"));
		const cloneDir = join(tempRoot, "repo");
		const requestedBranch = branch?.trim() || null;
		const githubAppId = this.project?.githubAppId;

		let token: string | null = null;
		if (githubAppId) {
			await this.appendBuildLog(
				deploymentId,
				`[auth] Authenticating with GitHub App...\n`,
			);
			token = await getInstallationToken(githubAppId);
		}

		let cloneUrl = repoUrl;
		if (token) {
			cloneUrl = repoUrl.replace(
				"https://",
				`https://x-access-token:${token}@`,
			);
		}

		const log = async (chunk: string) => {
			let safeChunk = chunk;
			if (token) {
				safeChunk = safeChunk.replaceAll(token, "********");
			}
			await this.appendBuildLog(deploymentId, safeChunk);
		};

		const cloneWithArgs = async (args: string[]) =>
			this.runProcess("git", ["clone", "--ipv4", "--depth", "1", ...args], {
				onData: log,
			});

		try {
			let gitCloneCode = 1;

			if (commitHash) {
				// When a specific commit is requested, do a full clone
				// can checkout any arbitrary SHA.
				await this.appendBuildLog(
					deploymentId,
					`\n[clone] Cloning ${repoUrl} for commit ${commitHash.substring(0, 7)}\n`,
				);

				const cloneArgs: string[] = [];
				if (requestedBranch) {
					cloneArgs.push("--branch", requestedBranch);
				}
				cloneArgs.push(cloneUrl, cloneDir);
				gitCloneCode = await cloneWithArgs(cloneArgs);

				if (gitCloneCode !== 0) {
					throw new Error(`git clone failed with exit code ${gitCloneCode}`);
				}

				// Checkout the specific commit
				await this.appendBuildLog(
					deploymentId,
					`[clone] Checking out commit ${commitHash.substring(0, 7)}\n`,
				);
				const checkoutCode = await this.runProcess(
					"git",
					["checkout", commitHash],
					{
						cwd: cloneDir,
						onData: (chunk) => {
							void this.appendBuildLog(deploymentId, chunk);
						},
					},
				);
				if (checkoutCode !== 0) {
					throw new Error(
						`git checkout ${commitHash.substring(0, 7)} failed with exit code ${checkoutCode}`,
					);
				}
			} else if (requestedBranch) {
				// Shallow clone at branch HEAD
				await this.appendBuildLog(
					deploymentId,
					`\n[clone] Cloning ${repoUrl} (branch: ${requestedBranch})\n`,
				);
				gitCloneCode = await cloneWithArgs([
					"--depth",
					"1",
					"--branch",
					requestedBranch,
					cloneUrl,
					cloneDir,
				]);

				if (gitCloneCode !== 0) {
					await this.appendBuildLog(
						deploymentId,
						`\n[clone] Branch '${requestedBranch}' not available. Retrying with repository default branch...\n`,
					);
					await rm(cloneDir, { recursive: true, force: true });
					gitCloneCode = await cloneWithArgs([
						"--depth",
						"1",
						cloneUrl,
						cloneDir,
					]);
				}

				if (gitCloneCode !== 0) {
					throw new Error(`git clone failed with exit code ${gitCloneCode}`);
				}
			} else {
				// Shallow clone at default branch HEAD
				await this.appendBuildLog(
					deploymentId,
					`\n[clone] Cloning ${repoUrl} (default branch)\n`,
				);
				gitCloneCode = await cloneWithArgs([
					"--depth",
					"1",
					cloneUrl,
					cloneDir,
				]);

				if (gitCloneCode !== 0) {
					throw new Error(`git clone failed with exit code ${gitCloneCode}`);
				}
			}

			// ── Capture commit info (hash + message) from HEAD ──
			const resolvedHash = await this.runCapture(
				"git",
				["rev-parse", "HEAD"],
				cloneDir,
			);
			const resolvedMessage = await this.runCapture(
				"git",
				["log", "-1", "--pretty=%s"],
				cloneDir,
			);

			await this.appendBuildLog(
				deploymentId,
				`[clone] Commit: ${resolvedHash.substring(0, 7)} — ${resolvedMessage}\n`,
			);

			const buildContextDir =
				rootDirectory && rootDirectory !== "/"
					? join(cloneDir, rootDirectory.replace(/^\/+/, ""))
					: cloneDir;

			await this.appendBuildLog(
				deploymentId,
				`\n[build] Running railpack in ${buildContextDir}\n`,
			);

			const _buildkitHost = await this.ensureLocalBuildkit(deploymentId);

			const railpackCode = await this.runProcess(
				"railpack",
				["build", ".", "--progress", "plain", "--name", imageName],
				{
					cwd: buildContextDir,
					env: {
						BUILDKIT_HOST: _buildkitHost,
					},
					onData: (chunk) => {
						void this.appendBuildLog(deploymentId, chunk);
					},
				},
			);

			if (railpackCode !== 0) {
				await this.appendBuildLog(
					deploymentId,
					`\n[railpack] railpack build failed with exit code ${railpackCode}\n`,
				);
				throw new Error(`railpack build failed with exit code ${railpackCode}`);
			}

			return { commitHash: resolvedHash, commitMessage: resolvedMessage };
		} catch (error) {
			console.error("Error during buildFromGitWithRailpack:", error);
			throw error;
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	}

	private async buildFromManual(
		deploymentId: string,
		dockerfileContent: string,
		imageTag: string,
	) {
		// 1. Create a clean temp directory (The "Context")
		const tempDir = await mkdtemp(join(tmpdir(), "vortex-manual-"));
		const dockerfilePath = join(tempDir, "Dockerfile");

		try {
			await this.appendBuildLog(
				deploymentId,
				`\n[setup] Creating temporary build context at ${tempDir}\n`,
			);

			// 2. Write the User's Content to a file
			// import { writeFile } from "node:fs/promises";
			await writeFile(dockerfilePath, dockerfileContent, "utf8");

			await this.appendBuildLog(
				deploymentId,
				`[setup] Dockerfile written. Starting build...\n`,
			);

			// 3. Run Standard Docker Build
			// We don't use Railpack here because the user GAVE us the instructions.
			const buildCode = await this.runProcess(
				"docker",
				[
					"build",
					"-f",
					"Dockerfile", // Use the file we just wrote
					"-t",
					imageTag, // Tag it immediately
					".", // Context is this temp dir
					"--progress",
					"plain", // Plain text logs for DB
				],
				{
					cwd: tempDir,
					onData: (chunk) => void this.appendBuildLog(deploymentId, chunk),
				},
			);

			if (buildCode !== 0) {
				throw new Error(`Docker build failed with exit code ${buildCode}`);
			}
		} catch (error) {
			console.error("Error during buildFromManual:", error);
			throw error;
		} finally {
			// 4. Cleanup: Remove the temp folder so we don't fill up the disk
			await rm(tempDir, { recursive: true, force: true });
		}
	}

	private async pullDockerImage(deploymentId: string, imageName: string) {
		await this.appendBuildLog(
			deploymentId,
			`\n[pull] Pulling image: ${imageName}...\n`,
		);

		// 1. Start the Pull
		// Note: If you need private registry auth, pass { authconfig: { ... } } as the second arg
		const stream = await docker.pull(imageName);
		type DockerPullProgressEvent = {
			status?: string;
			id?: string;
			progress?: string;
		};

		return new Promise<void>((resolve, reject) => {
			// 2. Docker sends a JSON stream (not text). We must parse it.
			docker.modem.followProgress(
				stream,
				(err: unknown, _output: unknown) => {
					// Finished
					if (err) return reject(err);
					resolve();
				},
				(event: DockerPullProgressEvent) => {
					// 3. Progress Update (The "Log Scraper")
					// Docker sends events like: { status: "Downloading", progress: "[==>]", id: "layer1" }
					if (event.status) {
						let logLine = `[${event.status}]`;
						if (event.id) logLine = `${event.id}: ${logLine}`;
						if (event.progress) logLine += ` ${event.progress}`;

						// Only log "important" status changes to avoid flooding the DB
						// or just append a newline.
						void this.appendBuildLog(deploymentId, `${logLine}\n`);
					}
				},
			);
		});
	}

	private async runDeploymentInBackground(
		deploymentId: string,
		project: Project,
		commitHash?: string,
	) {
		try {
			// mark current running deployments as superseded and fetch updated rows
			const supersededDeployments = await db
				.update(deployments)
				.set({ status: "SUPERSEDED" })
				.where(
					and(
						eq(deployments.projectId, this.projectId),
						eq(deployments.status, "BUILDING"),
					),
				)
				.returning();

			for (const supersededDeployment of supersededDeployments) {
				if (!supersededDeployment.containerId) continue;
				try {
					const container = docker.getContainer(
						supersededDeployment.containerId,
					);
					await container.stop();
					await container.remove({ force: true });
				} catch (error) {
					console.error(
						`Failed to stop superseded deployment container: ${supersededDeployment.containerId}`,
						error,
					);
				}
			}

			await db
				.update(deployments)
				.set({ status: "BUILDING", startedAt: new Date() })
				.where(eq(deployments.id, deploymentId));

			await db
				.update(projects)
				.set({ status: "DEPLOYING" })
				.where(eq(projects.id, this.projectId));

			const sourceType = project.sourceType;
			const imageName = this.getImageName(project);
			if (sourceType === "GIT") {
				const repoUrl = project.repoUrl;
				const branch = project.branch;

				if (!repoUrl) {
					throw new Error("Missing repoUrl for GIT source");
				}

				const gitInfo = await this.buildFromGitWithRailpack(
					deploymentId,
					repoUrl,
					branch,
					project.rootDirectory ?? "/",
					imageName,
					commitHash,
				);

				// Save the resolved commit info to the deployment
				await db
					.update(deployments)
					.set({
						commitHash: gitInfo.commitHash,
						commitMessage: gitInfo.commitMessage,
					})
					.where(eq(deployments.id, deploymentId));
			}

			if (sourceType === "DOCKER_REGISTRY") {
				if (!project.image) {
					throw new Error("Missing image name for DOCKER_REGISTRY source");
				}

				await this.pullDockerImage(deploymentId, project.image);

				// Tag the pulled image with our internal name for consistency
				const pulledImage = docker.getImage(project.image);
				await pulledImage.tag({ repo: imageName });
			}

			if (sourceType === "MANUAL") {
				if (project.dockerfileContent) {
					await this.buildFromManual(
						deploymentId,
						project.dockerfileContent,
						imageName,
					);
				} else if (project.composeFileContent) {
				} else {
					throw new Error(
						"For MANUAL source, either dockerfileContent or composeFileContent must be provided",
					);
				}
			}

			const portsData = await db
				.select()
				.from(projectPorts)
				.where(eq(projectPorts.projectId, this.projectId));

			const container = await createContainer({
				imageName,
				containerName: this.getContainerName(project.name, deploymentId),
				ports: portsData.map((p) => ({ port: p.port, domain: p.domain ?? null, exposedPort: p.exposedPort ?? null })),
				envVars: project.envVars ? JSON.parse(project.envVars) : undefined,
			});

			await this.appendBuildLog(
				deploymentId,
				`\n[deploy] Container created with ID: ${container.id}\n`,
			);

			// check if previous container have exposed same ports and if yes, stop and remove it before starting new container to avoid port conflicts
			const previousContainerId = project.containerId;
			let alreadyStoppedOldContainer = false;

			if (previousContainerId) {
				try {
					const previousContainer = docker.getContainer(previousContainerId);
					const previousInfo = await previousContainer.inspect();

					// Get the HOST ports the OLD container is listening on
					// Format: { "3000/tcp": [{ "HostIp": "0.0.0.0", "HostPort": "8080" }] }
					const oldBindings = previousInfo.NetworkSettings.Ports || {};
					const oldHostPorts = new Set<string>();

					Object.values(oldBindings).forEach((bindings) => {
						if (Array.isArray(bindings)) {
							bindings.forEach((b: { HostPort?: string; HostIp?: string }) => {
								if (b.HostPort) oldHostPorts.add(b.HostPort);
							});
						}
					});

					// Get the HOST ports the NEW container wants to bind to
					const newInfo = await container.inspect();
					const newBindings = newInfo.HostConfig?.PortBindings || {};

					let hasPortConflict = false;

					// Check if any NEW host port overlaps with an OLD host port
					Object.values(newBindings).forEach((bindings) => {
						if (Array.isArray(bindings)) {
							bindings.forEach((b: { HostPort?: string; HostIp?: string }) => {
								if (b.HostPort && oldHostPorts.has(b.HostPort)) {
									hasPortConflict = true;
								}
							});
						}
					});

					// 2. DECISION MATRIX
					if (hasPortConflict) {
						// STRATEGY A: CONFLICT (Direct Port 8080 -> 8080)
						await this.appendBuildLog(
							deploymentId,
							`[deploy] ⚠️ Host Port conflict detected. Stopping old container to free up port...\n`,
						);

						try {
							await previousContainer.stop();
							alreadyStoppedOldContainer = true;
						} catch {
							// Ignore if already stopped
						}
					} else {
						// STRATEGY B: NO CONFLICT (Traefik Domain OR Different Ports)
						await this.appendBuildLog(
							deploymentId,
							`[deploy] No port conflict. Starting new container for Zero Downtime update...\n`,
						);
					}
				} catch (error) {
					console.error("Conflict check failed:", error);
					// If check fails
				}
			}

			await container.start();
			const containerId = container.id;

			await db
				.update(deployments)
				.set({
					status: "READY",
					containerId,
					endedAt: new Date(),
				})
				.where(eq(deployments.id, deploymentId));

			await db
				.update(projects)
				.set({
					status: "RUNNING",
					containerId,
					currentDeploymentId: deploymentId,
				})
				.where(eq(projects.id, this.projectId));

			await this.appendBuildLog(
				deploymentId,
				`\n✅ Deployment successful! Container is running.\n`,
			);

			// Cleanup old container if exists
			console.log(
				`Checking for old container to clean up for project ${this.projectId}`,
			);
			if (project.containerId && !alreadyStoppedOldContainer) {
				try {
					const oldContainer = docker.getContainer(project.containerId);
					await oldContainer.stop();
					await oldContainer.remove({ force: true });
					await this.appendBuildLog(
						deploymentId,
						`[cleanup] Old container ${project.containerId} stopped and removed.\n`,
					);
				} catch (error) {
					if (
						typeof error === "object" &&
						error !== null &&
						"statusCode" in error &&
						error.statusCode !== 404
					) {
						console.error(
							`Failed to clean up old container: ${previousContainerId}`,
							error,
						);
						await this.appendBuildLog(
							deploymentId,
							`[cleanup] old container not found could be already removed manualy.\n`,
						);
					} else {
						await this.appendBuildLog(
							deploymentId,
							`[cleanup] Failed to remove old container ${project.containerId}. Check logs for details.\n`,
						);
						console.error(
							`Failed to clean up old container stop it manualy if exits : ${project.containerId}`,
							error,
						);
					}
				}
			}
		} catch (error) {
			await db
				.update(deployments)
				.set({ status: "FAILED", endedAt: new Date() })
				.where(eq(deployments.id, deploymentId));

			await db
				.update(projects)
				.set({ status: "FAILED" })
				.where(eq(projects.id, this.projectId));

			await this.appendBuildLog(
				deploymentId,
				`\n❌ Deployment failed: ${(error as Error).message}\n`,
			);
			console.error(
				`Deployment failed for project ${this.projectId} (deployment ${deploymentId})`,
				error,
			);
		} finally {
			eventBus.emit(`end:${deploymentId}`, null);
		}
	}

	async startNewDeployment(
		source: "manual" | "webhook" | "redeploy" = "manual",
		commitHash?: string,
	) {
		const project = await this.getProjectFromDb();

		const [newDeployment] = await db
			.insert(deployments)
			.values({
				projectId: this.projectId,
				status: "QUEUED",
				trigger: source,
				commitHash: commitHash,
			})
			.returning();

		if (!newDeployment) {
			throw new Error("Failed to create deployment record");
		}

		const deploymentId = newDeployment.id;

		await db
			.update(projects)
			.set({ status: "STARTING", activeDeploymentId: deploymentId })
			.where(eq(projects.id, this.projectId));

		void this.runDeploymentInBackground(deploymentId, project, commitHash);

		return deploymentId;
	}
}

export default DeploymentService;
