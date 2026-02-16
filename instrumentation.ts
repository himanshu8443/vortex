export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		const { ContainerReconciler } = await import(
			"@/server/services/worker/reconciler.service"
		);
		ContainerReconciler.start();
	}
}
