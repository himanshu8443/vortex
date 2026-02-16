import type { GitBuildMethod, RuntimePortEntry, SourceType } from "./types";

interface SummaryStepProps {
	projectName: string;
	sourceType: SourceType;
	repoUrl: string;
	gitBuildMethod: GitBuildMethod;
	imageName: string;
	imageTag: string;
	runtimePorts: RuntimePortEntry[];
	branch: string;
}

export function SummaryStep({
	projectName,
	sourceType,
	repoUrl,
	gitBuildMethod,
	imageName,
	imageTag,
	runtimePorts,
	branch,
}: SummaryStepProps) {
	return (
		<div className="space-y-2.5 rounded-lg border p-3 text-sm">
			<div className="flex justify-between">
				<span className="text-muted-foreground">Project</span>
				<span>{projectName || "-"}</span>
			</div>
			<div className="flex justify-between">
				<span className="text-muted-foreground">Source Type</span>
				<span>{sourceType.replace("_", " ")}</span>
			</div>
			{sourceType === "GIT" && (
				<>
					<div className="flex justify-between">
						<span className="text-muted-foreground">Repository</span>
						<span className="max-w-[70%] truncate text-right">
							{repoUrl || "-"}
						</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">Branch</span>
						<span>{branch || "main"}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">Build Method</span>
						<span>
							{gitBuildMethod === "NIXPACKS"
								? "Auto Detect (Nixpacks)"
								: "Dockerfile Path"}
						</span>
					</div>
				</>
			)}
			{sourceType === "DOCKER_IMAGE" && (
				<div className="flex justify-between">
					<span className="text-muted-foreground">Image</span>
					<span>
						{imageName}:{imageTag || "latest"}
					</span>
				</div>
			)}
			<div className="flex justify-between">
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
