import { useProjectForm } from "./types";

export function SummaryStep() {
	const { formData } = useProjectForm();
	const {
		projectName,
		sourceType,
		repoUrl,
		gitBuildMethod,
		imageName,
		imageTag,
		runtimePorts,
		branch,
	} = formData;

	return (
		<div className="space-y-3 rounded-lg border border-border/60 bg-card/20 p-4 text-sm shadow-sm">
			<div className="flex justify-between border-border/50 border-b pb-2">
				<span className="text-muted-foreground">Project</span>
				<span className="font-medium">{projectName || "-"}</span>
			</div>

			<div className="flex justify-between border-border/50 border-b py-2">
				<span className="text-muted-foreground">Source Type</span>
				<span className="font-medium">{sourceType.replace("_", " ")}</span>
			</div>

			{sourceType === "GIT" && (
				<>
					<div className="flex justify-between border-border/50 border-b py-2">
						<span className="text-muted-foreground">Repository</span>
						<span className="mt-0.5 max-w-[70%] truncate text-right font-mono text-xs">
							{repoUrl || "-"}
						</span>
					</div>
					<div className="flex justify-between border-border/50 border-b py-2">
						<span className="text-muted-foreground">Branch</span>
						<span className="font-medium">{branch || "main"}</span>
					</div>
					<div className="flex justify-between border-border/50 border-b py-2">
						<span className="text-muted-foreground">Build Method</span>
						<span className="font-medium">
							{gitBuildMethod === "NIXPACKS"
								? "Auto Detect (Nixpacks)"
								: "Dockerfile Path"}
						</span>
					</div>
				</>
			)}

			{sourceType === "DOCKER_IMAGE" && (
				<div className="flex justify-between border-border/50 border-b py-2">
					<span className="text-muted-foreground">Image</span>
					<span className="mt-0.5 font-mono text-xs">
						{imageName}:{imageTag || "latest"}
					</span>
				</div>
			)}

			<div className="flex justify-between pt-2">
				<span className="text-muted-foreground">Ports</span>
				<span className="text-right text-xs">
					{runtimePorts.filter((entry) => entry.port.trim()).length > 0
						? runtimePorts
								.filter((entry) => entry.port.trim())
								.map(
									(entry) =>
										`Container: ${entry.port}${entry.exposedPort ? ` → Exposed: ${entry.exposedPort}` : ""}${entry.domain ? ` | Domain: ${entry.domain}` : ""}`,
								)
								.join("; ")
						: "-"}
				</span>
			</div>
		</div>
	);
}
