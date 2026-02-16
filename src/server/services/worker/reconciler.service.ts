import { eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { projects } from "@/server/db/schema";
import { docker } from "@/server/docker";

export class ContainerReconciler {
	private static isRunning = false;

	static start() {
		console.log("Container Reconciler Started...");

		// Run every 5 seconds
		setInterval(() => {
			void ContainerReconciler.syncState();
		}, 5000);
	}

	private static async syncState() {
		if (ContainerReconciler.isRunning) return;
		ContainerReconciler.isRunning = true;

		try {
			// 1. FILTER: Only check projects that are supposed to be "Stable"
			// We explicitly IGNORE: 'QUEUED', 'BUILDING', 'DEPLOYING', 'STARTING'
			const activeProjects = await db.query.projects.findMany({
				where: inArray(projects.status, ["RUNNING", "FAILED", "IDLE"]),
				columns: { id: true, containerId: true, status: true },
			});

			for (const project of activeProjects) {
				// If it's IDLE/FAILED but has no container, nothing to check.
				if (!project.containerId) continue;

				try {
					const container = docker.getContainer(project.containerId);
					const info = await container.inspect();

					// 2. Map Docker State -> DB Status
					let actualState = "IDLE" as "RUNNING" | "FAILED" | "IDLE";

					if (info.State.Running) {
						actualState = "RUNNING";
					} else if (info.State.ExitCode !== 0) {
						actualState = "FAILED"; // Crashed
					} else {
						actualState = "IDLE"; // Stopped gracefully
					}

					// 3. Fix Discrepancies
					if (actualState !== project.status) {
						console.log(
							`⚠️ Reconciler: Fixing ${project.id} (${project.status} -> ${actualState})`,
						);

						await db
							.update(projects)
							.set({ status: actualState })
							.where(eq(projects.id, project.id));
					}
				} catch (error) {
					// 404 = Container was manually deleted via CLI or Prune
					if (
						typeof error === "object" &&
						error !== null &&
						"statusCode" in error &&
						error.statusCode === 404
					) {
						if (project.status !== "IDLE") {
							console.log(
								` Reconciler: Container gone for ${project.id}. Setting to IDLE.`,
							);
							await db
								.update(projects)
								.set({ status: "IDLE", containerId: null })
								.where(eq(projects.id, project.id));
						}
					}
				}
			}
		} catch (e) {
			console.error("Reconciler Loop Error:", e);
		} finally {
			ContainerReconciler.isRunning = false;
		}
	}
}
