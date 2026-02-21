export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		const { default: DeploymentService } = await import(
			"@/server/services/deployment.service" // adjust path if needed
		);
		await DeploymentService.recoverStuckDeployments().catch(console.error);

		const { ContainerReconciler } = await import(
			"@/server/services/worker/reconciler.service"
		);
		ContainerReconciler.start();
	}
}
