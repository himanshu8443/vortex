"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	getAvailableCpuOptions,
	getAvailableMemoryOptions,
} from "@/lib/resource-options";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

import { BuildStep } from "./build-step";
import { EnvironmentStep } from "./environment-step";
import { RuntimeStep } from "./runtime-step";
import { SourceStep } from "./source-step";
import { SummaryStep } from "./summary-step";
import {
	createEnvVarEntry,
	createRuntimePortEntry,
	type EnvVarEntry,
	extractGitHubRepoPath,
	type GitBuildMethod,
	type RuntimePortEntry,
	type SourceType,
} from "./types";

export function CreateProjectDialog({
	children,
}: {
	children: React.ReactNode;
}) {
	const router = useRouter();
	const utils = api.useUtils();
	const [open, setOpen] = React.useState(false);
	const [stepIndex, setStepIndex] = React.useState(0);

	// ─── Source state ─────────────────────────────────────────
	const [projectName, setProjectName] = React.useState("");
	const [sourceType, setSourceType] = React.useState<SourceType>("GIT");
	const [repoUrl, setRepoUrl] = React.useState("");
	const [repoValidationMessage, setRepoValidationMessage] = React.useState("");
	const [repoValidated, setRepoValidated] = React.useState(false);
	const [isValidatingRepo, setIsValidatingRepo] = React.useState(false);
	const [gitBuildMethod, setGitBuildMethod] =
		React.useState<GitBuildMethod>("NIXPACKS");
	const [dockerfilePathForGit, setDockerfilePathForGit] =
		React.useState("/Dockerfile");
	const [branch, setBranch] = React.useState("main");
	const [imageName, setImageName] = React.useState("");
	const [imageTag, setImageTag] = React.useState("latest");
	const [dockerfilePath, setDockerfilePath] = React.useState("/Dockerfile");
	const [buildContextPath, setBuildContextPath] = React.useState("/");

	// ─── GitHub Integration ──────────────────────────────────
	const [selectedGithubAppId, setSelectedGithubAppId] = React.useState<
		string | null
	>(null);

	const { data: githubApps = [] } = api.github.listApps.useQuery();
	console.log(selectedGithubAppId);

	const { data: githubRepos = [], isLoading: isLoadingRepos } =
		api.github.listRepos.useQuery(
			{ githubAppId: selectedGithubAppId ?? "" },
			{
				enabled: !!selectedGithubAppId && selectedGithubAppId !== "new",
			},
		);

	// ─── Build state ──────────────────────────────────────────
	const [overrideInstallCommand, setOverrideInstallCommand] =
		React.useState(false);
	const [installCommand, setInstallCommand] = React.useState("");
	const [overrideBuildCommand, setOverrideBuildCommand] = React.useState(false);
	const [buildCommand, setBuildCommand] = React.useState("");
	const [overrideStartCommand, setOverrideStartCommand] = React.useState(false);
	const [startCommand, setStartCommand] = React.useState("");
	const [rootPath, setRootPath] = React.useState("/");

	// ─── Runtime state ────────────────────────────────────────
	const [runtimePorts, setRuntimePorts] = React.useState<RuntimePortEntry[]>([
		{ ...createRuntimePortEntry(), port: "3000" },
	]);
	const [cpuLimit, setCpuLimit] = React.useState("0.5");
	const [memoryLimit, setMemoryLimit] = React.useState("512m");

	// ─── Environment state ────────────────────────────────────
	const [envVars, setEnvVars] = React.useState<EnvVarEntry[]>([
		createEnvVarEntry(),
	]);
	const [formError, setFormError] = React.useState("");

	// ─── Steps ────────────────────────────────────────────────
	const showBuildStep = sourceType === "GIT" && gitBuildMethod === "NIXPACKS";

	const visibleSteps = React.useMemo(
		() =>
			showBuildStep
				? (["Source", "Build", "Runtime", "Environment", "Summary"] as const)
				: (["Source", "Runtime", "Environment", "Summary"] as const),
		[showBuildStep],
	);

	const currentStep = visibleSteps[stepIndex] ?? visibleSteps[0];

	React.useEffect(() => {
		if (stepIndex > visibleSteps.length - 1) {
			setStepIndex(visibleSteps.length - 1);
		}
	}, [stepIndex, visibleSteps.length]);

	// ─── Branch fetch ─────────────────────────────────────────
	const { data: fetchedBranches } = api.project.fetchBranches.useQuery(
		{
			repoUrl,
			githubAppId:
				selectedGithubAppId && selectedGithubAppId !== "new"
					? selectedGithubAppId
					: undefined,
		},
		{
			enabled: sourceType === "GIT" && repoUrl.trim().length > 5,
			staleTime: 60_000,
		},
	);
	const branches = fetchedBranches ?? [];

	// ─── Host resources ──────────────────────────────────────
	const { data: hostResources } = api.project.getHostResources.useQuery(
		undefined,
		{ staleTime: 60_000 },
	);
	const cpuOptions = getAvailableCpuOptions(hostResources?.cpuCount ?? 1);
	const memoryOptions = getAvailableMemoryOptions(
		hostResources?.totalMemoryBytes ?? 512 * 1024 * 1024,
	);

	// ─── Mutation ─────────────────────────────────────────────
	const createProject = api.project.create.useMutation({
		onSuccess: async (response) => {
			await utils.project.getAllProjects.invalidate();
			setOpen(false);
			router.push(`/projects/${response.data.projectId}`);
		},
		onError: (error) => {
			setFormError(error.message || "Failed to create project");
		},
	});

	// ─── Validation ───────────────────────────────────────────
	const canProceed = React.useMemo(() => {
		if (currentStep === "Source") {
			if (!projectName.trim()) return false;
			if (sourceType === "GIT") return !!repoUrl.trim();
			if (sourceType === "DOCKER_IMAGE") return !!imageName.trim();
			return !!dockerfilePath.trim();
		}
		if (currentStep === "Build") {
			if (overrideBuildCommand && !buildCommand.trim()) return false;
			if (overrideStartCommand && !startCommand.trim()) return false;
			if (overrideInstallCommand && !installCommand.trim()) return false;
			return true;
		}
		if (currentStep === "Runtime") {
			if (runtimePorts.length === 0) return false;
			for (const entry of runtimePorts) {
				if (!entry.port.trim() || !entry.domain.trim()) return false;
			}
			return true;
		}
		return true;
	}, [
		buildCommand,
		dockerfilePath,
		imageName,
		installCommand,
		overrideBuildCommand,
		overrideInstallCommand,
		overrideStartCommand,
		projectName,
		repoUrl,
		runtimePorts,
		sourceType,
		startCommand,
		currentStep,
	]);

	// ─── Handlers ─────────────────────────────────────────────
	const validateRepository = async () => {
		setRepoValidationMessage("");
		setRepoValidated(false);
		const repoPath = extractGitHubRepoPath(repoUrl);
		if (!repoPath) {
			setRepoValidationMessage(
				"Use a valid GitHub URL, e.g. https://github.com/org/repo",
			);
			return;
		}
		setIsValidatingRepo(true);
		try {
			const response = await fetch(`https://api.github.com/repos/${repoPath}`);
			if (!response.ok) {
				setRepoValidationMessage("Repository not found or not accessible");
				return;
			}
			setRepoValidated(true);
			setRepoValidationMessage("Repository validated successfully");
		} catch {
			setRepoValidationMessage("Failed to validate repository. Try again.");
		} finally {
			setIsValidatingRepo(false);
		}
	};

	const handleOnSelectGithubApp = (id: string | null) => {
		console.log(id);
		setSelectedGithubAppId(id);
	};

	const handleCreate = () => {
		setFormError("");
		const portsData = runtimePorts.map((entry) => ({
			port: Number(entry.port),
			domain: entry.domain.trim(),
		}));

		if (portsData.length === 0) {
			setFormError("Add at least one port and domain");
			return;
		}
		for (const item of portsData) {
			if (!Number.isFinite(item.port) || item.port < 1 || item.port > 65535) {
				setFormError("Each port must be between 1 and 65535");
				return;
			}
			if (!item.domain) {
				setFormError("Each port entry requires a domain/subdomain");
				return;
			}
		}

		const filteredEnvVars = envVars
			.filter((entry) => entry.key.trim() && entry.value.trim())
			.map((entry) => ({ key: entry.key.trim(), value: entry.value.trim() }));

		createProject.mutate({
			name: projectName.trim(),
			portsData,
			sourceType:
				sourceType === "DOCKER_IMAGE"
					? "DOCKER_REGISTRY"
					: sourceType === "DOCKERFILE"
						? "MANUAL"
						: "GIT",
			buildType:
				sourceType === "GIT"
					? gitBuildMethod === "NIXPACKS"
						? "NIXPACKS"
						: "DOCKERFILE"
					: sourceType === "DOCKERFILE"
						? "DOCKERFILE"
						: undefined,
			repoUrl: sourceType === "GIT" ? repoUrl.trim() : undefined,
			branch: sourceType === "GIT" ? branch : undefined,
			rootDirectory:
				sourceType === "GIT"
					? rootPath.trim() || "/"
					: sourceType === "DOCKERFILE"
						? buildContextPath.trim() || "/"
						: undefined,
			githubAppId:
				sourceType === "GIT" &&
				selectedGithubAppId &&
				selectedGithubAppId !== "new"
					? selectedGithubAppId
					: undefined,
			dockerfilePath:
				sourceType === "DOCKERFILE"
					? dockerfilePath.trim()
					: sourceType === "GIT" && gitBuildMethod === "DOCKERFILE_PATH"
						? dockerfilePathForGit.trim()
						: undefined,
			image:
				sourceType === "DOCKER_IMAGE"
					? `${imageName.trim()}:${(imageTag || "latest").trim()}`
					: undefined,
			installCommand: overrideInstallCommand
				? installCommand.trim()
				: undefined,
			buildCommand: overrideBuildCommand ? buildCommand.trim() : undefined,
			startCommand: overrideStartCommand ? startCommand.trim() : undefined,
			envVars: filteredEnvVars.length > 0 ? filteredEnvVars : undefined,
			cpuLimit,
			memoryLimit,
		});
	};

	// ─── List helpers ─────────────────────────────────────────
	const addRuntimePort = () =>
		setRuntimePorts((prev) => [...prev, createRuntimePortEntry()]);
	const removeRuntimePort = (index: number) =>
		setRuntimePorts((prev) => prev.filter((_, i) => i !== index));
	const updateRuntimePort = (
		index: number,
		field: "port" | "domain" | "exposedPort",
		value: string,
	) =>
		setRuntimePorts((prev) =>
			prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)),
		);

	const addEnvVar = () => setEnvVars((prev) => [...prev, createEnvVarEntry()]);
	const removeEnvVar = (index: number) =>
		setEnvVars((prev) => prev.filter((_, i) => i !== index));
	const updateEnvVar = (index: number, field: "key" | "value", value: string) =>
		setEnvVars((prev) =>
			prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)),
		);

	const goNext = () => {
		if (stepIndex < visibleSteps.length - 1) setStepIndex((c) => c + 1);
	};
	const goBack = () => {
		if (stepIndex > 0) setStepIndex((c) => c - 1);
	};

	const resetDialog = () => {
		setStepIndex(0);
		setFormError("");
		setRepoValidated(false);
		setRepoValidationMessage("");
	};

	// ─── Render ───────────────────────────────────────────────
	return (
		<Dialog
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) resetDialog();
			}}
			open={open}
		>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="gap-0 overflow-hidden border-border/50 bg-background/80 p-0 backdrop-blur-xl sm:max-w-3xl">
				<DialogHeader className="border-border/50 border-b px-5 pt-4 pb-3">
					<DialogTitle>Create New Project</DialogTitle>
				</DialogHeader>

				<div className="h-[62vh] space-y-4 overflow-y-auto bg-card/10 p-4">
					{/* Step indicator */}
					<div className="flex items-center justify-between rounded-md border border-border/60 bg-card/20 px-3 py-2">
						<div className="font-medium text-sm">{currentStep}</div>
						<div className="flex items-center gap-2">
							{visibleSteps.map((label, index) => (
								<div
									className={cn(
										"h-2.5 w-2.5 rounded-full border border-border/70",
										index === stepIndex && "border-primary bg-primary",
										index < stepIndex && "border-primary/70 bg-primary/60",
									)}
									key={label}
								/>
							))}
						</div>
					</div>

					{/* Step content */}
					{currentStep === "Source" && (
						<SourceStep
							branch={branch}
							branches={branches}
							buildContextPath={buildContextPath}
							dockerfilePath={dockerfilePath}
							dockerfilePathForGit={dockerfilePathForGit}
							gitBuildMethod={gitBuildMethod}
							githubApps={githubApps}
							githubRepos={githubRepos}
							imageName={imageName}
							imageTag={imageTag}
							isLoadingRepos={isLoadingRepos}
							isValidatingRepo={isValidatingRepo}
							onBranchChange={setBranch}
							onBuildContextPathChange={setBuildContextPath}
							onDockerfilePathChange={setDockerfilePath}
							onDockerfilePathForGitChange={setDockerfilePathForGit}
							onGitBuildMethodChange={setGitBuildMethod}
							onImageNameChange={setImageName}
							onImageTagChange={setImageTag}
							onProjectNameChange={setProjectName}
							onRepoUrlChange={setRepoUrl}
							onSelectGithubApp={handleOnSelectGithubApp}
							onSourceTypeChange={setSourceType}
							onValidateRepo={validateRepository}
							projectName={projectName}
							repoUrl={repoUrl}
							repoValidated={repoValidated}
							repoValidationMessage={repoValidationMessage}
							selectedGithubAppId={selectedGithubAppId}
							sourceType={sourceType}
						/>
					)}

					{currentStep === "Build" && (
						<BuildStep
							buildCommand={buildCommand}
							installCommand={installCommand}
							onBuildCommandChange={setBuildCommand}
							onInstallCommandChange={setInstallCommand}
							onOverrideBuildCommandChange={setOverrideBuildCommand}
							onOverrideInstallCommandChange={setOverrideInstallCommand}
							onOverrideStartCommandChange={setOverrideStartCommand}
							onRootPathChange={setRootPath}
							onStartCommandChange={setStartCommand}
							overrideBuildCommand={overrideBuildCommand}
							overrideInstallCommand={overrideInstallCommand}
							overrideStartCommand={overrideStartCommand}
							rootPath={rootPath}
							startCommand={startCommand}
						/>
					)}

					{currentStep === "Runtime" && (
						<RuntimeStep
							cpuLimit={cpuLimit}
							cpuOptions={cpuOptions}
							memoryLimit={memoryLimit}
							memoryOptions={memoryOptions}
							onAddPort={addRuntimePort}
							onCpuLimitChange={setCpuLimit}
							onMemoryLimitChange={setMemoryLimit}
							onRemovePort={removeRuntimePort}
							onUpdatePort={updateRuntimePort}
							runtimePorts={runtimePorts}
						/>
					)}

					{currentStep === "Environment" && (
						<EnvironmentStep
							envVars={envVars}
							onAddVar={addEnvVar}
							onRemoveVar={removeEnvVar}
							onUpdateVar={updateEnvVar}
						/>
					)}

					{currentStep === "Summary" && (
						<SummaryStep
							branch={branch}
							gitBuildMethod={gitBuildMethod}
							imageName={imageName}
							imageTag={imageTag}
							projectName={projectName}
							repoUrl={repoUrl}
							runtimePorts={runtimePorts}
							sourceType={sourceType}
						/>
					)}

					{formError && (
						<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-destructive text-sm">
							{formError}
						</div>
					)}
				</div>

				<DialogFooter className="px-5 pt-2 pb-4">
					<DialogClose asChild>
						<Button type="button" variant="outline">
							Cancel
						</Button>
					</DialogClose>
					{stepIndex > 0 && (
						<Button onClick={goBack} type="button" variant="outline">
							Back
						</Button>
					)}
					{stepIndex < visibleSteps.length - 1 ? (
						<Button disabled={!canProceed} onClick={goNext} type="button">
							Next
						</Button>
					) : (
						<Button
							disabled={createProject.isPending}
							onClick={handleCreate}
							type="button"
						>
							{createProject.isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Creating...
								</>
							) : (
								"Create Project"
							)}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
