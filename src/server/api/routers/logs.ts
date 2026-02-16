import { on } from "node:events";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { deployments, projects } from "@/server/db/schema";
import { docker } from "@/server/docker";
import { eventBus } from "@/server/event-bus";

export const logsRouter = createTRPCRouter({
	streamProjectLogs: protectedProcedure
		.input(z.object({ projectId: z.string() }))
		.subscription(async function* ({ ctx, input, signal }) {
			const project = await ctx.db.query.projects.findFirst({
				where: eq(projects.id, input.projectId),
			});

			if (!project?.containerId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Project is not running (no container ID found)",
				});
			}

			let stream: NodeJS.ReadableStream | null = null;

			try {
				const container = docker.getContainer(project.containerId);

				// 2. Get the Docker Log Stream
				stream = await container.logs({
					follow: true,
					stdout: true,
					stderr: true,
					tail: 50, // Send the last 50 lines context immediately
				});

				// 3. Iterate over the stream (Native Node.js Async Iterator)
				for await (const chunk of stream) {
					// Check if client disconnected
					if (signal?.aborted) break;

					// 4. Clean Docker Headers (The 8-byte prefix issue)
					const buffer = Buffer.from(chunk);

					const text = buffer.toString("utf8");

					// Yield the text to the client
					// biome-ignore lint/suspicious/noControlCharactersInRegex: allow
					yield text.replace(/^[\u0000-\u0002].{7}/gm, "");
				}
			} catch (error) {
				// If container dies or stream fails, we exit silently or yield an error message
				console.error("Log stream error:", error);
				yield `\r\n\x1b[31m[System] Container log stream ended.\x1b[0m\r\n`;
			} finally {
				// 5. CLEANUP: This block runs when the client disconnects!
				if (stream && "destroy" in stream) {
					(stream as NodeJS.ReadableStream & { destroy: () => void }).destroy();
					console.log(
						`Client disconnected, closed log stream for ${project.containerId}`,
					);
				}
			}
		}),
	streamDeploymentLogs: protectedProcedure
		.input(z.object({ deploymentId: z.string() }))
		.subscription(async function* ({ ctx, input, signal }) {
			// STEP 1: Catch up (Send existing logs from DB)
			const deployment = await ctx.db.query.deployments.findFirst({
				where: eq(deployments.id, input.deploymentId),
			});

			if (deployment?.buildLogs) {
				yield deployment.buildLogs;
			}

			// If build is already done, stop here.
			if (deployment?.status === "READY" || deployment?.status === "FAILED") {
				return;
			}

			// STEP 2: Listen for Live Events
			const logIterator = on(eventBus, `logs:${input.deploymentId}`, {
				signal, // Auto-cleanup when client disconnects!
			});

			const _endPromise = new Promise<void>((resolve) => {
				eventBus.once(`end:${input.deploymentId}`, resolve);
			});

			try {
				for await (const [chunk] of logIterator) {
					if (chunk === null) break; // Exit loop, closing the stream

					yield chunk as string;

					if (signal?.aborted) break;
				}
			} catch (err) {
				// 'on' throws an AbortError when signal is aborted, which is expected
				if (err instanceof Error && err.name !== "AbortError")
					console.error("Stream error", err);
			}
		}),
});
