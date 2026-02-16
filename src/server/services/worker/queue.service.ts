import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { deployments } from "@/server/db/schema";

const CONCURRENCY_LIMIT = 2; // Run 2 builds at a time max

export class BuildQueue {
	private static isProcessing = false;

	// Call this once when your server starts
	static startWorker() {
		console.log("👷 Build Queue Worker Started...");

		// Poll every 2 seconds
		setInterval(async () => {
			if (BuildQueue.isProcessing) return;
			await BuildQueue.processNext();
		}, 2000);
	}

	private static async processNext() {
		BuildQueue.isProcessing = true;

		try {
			// 1. Check how many are running right now
			const running = await db.query.deployments.findMany({
				where: eq(deployments.status, "BUILDING"),
			});

			if (running.length >= CONCURRENCY_LIMIT) {
				return; // Queue is full, wait for next tick
			}

			// 2. Find the OLDEST 'QUEUED' deployment (FIFO)
			const nextJob = await db.query.deployments.findFirst({
				where: eq(deployments.status, "QUEUED"),
				orderBy: [asc(deployments.startedAt)],
			});

			if (!nextJob) return; // Nothing to do

			// 3. LOCK IT immediately so no other worker picks it up
			// (Optimistic locking for SQLite)
			await db
				.update(deployments)
				.set({ status: "BUILDING", startedAt: new Date() })
				.where(eq(deployments.id, nextJob.id));

			console.log(`🚀 Starting build for deployment: ${nextJob.id}`);

			// NOTE:
			// Deployment execution is currently started by DeploymentService.startNewDeployment()
			// via its own background runner. This queue worker only manages queue state checks.
		} catch (e) {
			console.error("Queue Worker Error:", e);
		} finally {
			BuildQueue.isProcessing = false;
		}
	}
}
