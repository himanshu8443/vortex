"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

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
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { toast } from "sonner";

import { BuildStep } from "./build-step";
import { EnvironmentStep } from "./environment-step";
import { RuntimeStep } from "./runtime-step";
import { SourceStep } from "./source-step";
import { SummaryStep } from "./summary-step";
import {
	createEnvVarEntry,
	createRuntimePortEntry,
	ProjectFormContext,
	type ProjectFormData,
} from "./types";

const INITIAL_FORM_DATA: ProjectFormData = {
	projectName: "",
	sourceType: "GIT",
	repoUrl: "",
	gitBuildMethod: "NIXPACKS",
	dockerfilePathForGit: "/Dockerfile",
	branch: "main",
	imageName: "",
	imageTag: "latest",
	dockerfilePath: "/Dockerfile",
	buildContextPath: "/",
	selectedGithubAppId: null,

	overrideInstallCommand: false,
	installCommand: "",
	overrideBuildCommand: false,
	buildCommand: "",
	overrideStartCommand: false,
	startCommand: "",
	rootPath: "/",

	runtimePorts: [
		{ ...createRuntimePortEntry("runtime-port-init"), port: "3000" },
	],
	cpuLimit: "0.5",
	memoryLimit: "512m",

	envVars: [createEnvVarEntry("env-var-init")],
};

export function CreateProjectDialog({
	children,
}: {
	children: React.ReactNode;
}) {
	const router = useRouter();
	const utils = api.useUtils();

	const [open, setOpen] = useState(false);
	const [stepIndex, setStepIndex] = useState(0);
	const [formError, setFormError] = useState("");

	const [formData, setFormData] = useState<ProjectFormData>(INITIAL_FORM_DATA);

	const updateForm = useCallback((updates: Partial<ProjectFormData>) => {
		setFormData((prev) => ({ ...prev, ...updates }));
	}, []);

	// Steps logic
	const showBuildStep =
		formData.sourceType === "GIT" && formData.gitBuildMethod === "NIXPACKS";
	const visibleSteps = useMemo(
		() =>
			showBuildStep
				? (["Source", "Build", "Runtime", "Environment", "Summary"] as const)
				: (["Source", "Runtime", "Environment", "Summary"] as const),
		[showBuildStep],
	);

	const currentStep = visibleSteps[stepIndex] ?? visibleSteps[0];

	// Ensure step index stays in bounds if steps change
	if (stepIndex > visibleSteps.length - 1) {
		setStepIndex(visibleSteps.length - 1);
	}

	const createProject = api.project.create.useMutation({
		onSuccess: async (response) => {
			await utils.project.getAllProjects.invalidate();
			toast.success("Project created successfully");
			setOpen(false);
			router.push(`/projects/${response.data.projectId}`);
		},
		onError: (error) => {
			setFormError(error.message || "Failed to create project");
			toast.error(error.message || "Failed to create project");
		},
	});

	const canProceed = useMemo(() => {
		if (currentStep === "Source") {
			if (!formData.projectName.trim()) return false;
			if (formData.sourceType === "GIT") return !!formData.repoUrl.trim();
			if (formData.sourceType === "DOCKER_IMAGE")
				return !!formData.imageName.trim();
			return !!formData.dockerfilePath.trim();
		}
		if (currentStep === "Build") {
			if (formData.overrideBuildCommand && !formData.buildCommand.trim())
				return false;
			if (formData.overrideStartCommand && !formData.startCommand.trim())
				return false;
			if (formData.overrideInstallCommand && !formData.installCommand.trim())
				return false;
			return true;
		}
		if (currentStep === "Runtime") {
			const activePorts = formData.runtimePorts.filter(
				(entry) => entry.port.trim() || entry.domain.trim() || entry.exposedPort.trim(),
			);
			for (const entry of activePorts) {
				if (!entry.port.trim() || (!entry.domain.trim() && !entry.exposedPort.trim())) return false;
			}
			return true;
		}
		return true;
	}, [currentStep, formData]);

	const handleCreate = () => {
		setFormError("");
		const portsData = formData.runtimePorts
			.filter((entry) => entry.port.trim() && (entry.domain.trim() || entry.exposedPort.trim()))
			.map((entry) => {
				let domain: string | undefined = entry.domain.trim() || undefined;
				// If a domain is provided but lacks a protocol, default to https://
				if (domain && !/^https?:\/\//i.test(domain)) {
					domain = `https://${domain}`;
				}
				return {
					port: Number(entry.port),
					domain,
					exposedPort: entry.exposedPort.trim() || undefined,
				};
			});

		for (const item of portsData) {
			if (!Number.isFinite(item.port) || item.port < 1 || item.port > 65535) {
				setFormError("Each port must be between 1 and 65535");
				return;
			}
			if (!item.domain && !item.exposedPort) {
				setFormError("Each port entry requires a domain/subdomain or an exposed port");
				return;
			}
			if (item.domain) {
				try {
					const url = new URL(item.domain);
					if (url.protocol !== "http:" && url.protocol !== "https:") {
						setFormError("Domain must use http:// or https://");
						return;
					}
					if (url.pathname !== "/" && url.pathname !== "") {
						setFormError("Domain must simply be a domain without a path (e.g. https://app.example.com)");
						return;
					}
				} catch {
					setFormError(`Invalid domain format for port ${item.port}`);
					return;
				}
			}
		}

		const filteredEnvVars = formData.envVars
			.filter((entry) => entry.key.trim() && entry.value.trim())
			.map((entry) => ({ key: entry.key.trim(), value: entry.value.trim() }));

		createProject.mutate({
			name: formData.projectName.trim(),
			portsData,
			sourceType:
				formData.sourceType === "DOCKER_IMAGE"
					? "DOCKER_REGISTRY"
					: formData.sourceType === "DOCKERFILE"
						? "MANUAL"
						: "GIT",
			buildType:
				formData.sourceType === "GIT"
					? formData.gitBuildMethod === "NIXPACKS"
						? "NIXPACKS"
						: "DOCKERFILE"
					: formData.sourceType === "DOCKERFILE"
						? "DOCKERFILE"
						: undefined,
			repoUrl:
				formData.sourceType === "GIT" ? formData.repoUrl.trim() : undefined,
			branch: formData.sourceType === "GIT" ? formData.branch : undefined,
			rootDirectory:
				formData.sourceType === "GIT"
					? formData.rootPath.trim() || "/"
					: formData.sourceType === "DOCKERFILE"
						? formData.buildContextPath.trim() || "/"
						: undefined,
			githubAppId:
				formData.sourceType === "GIT" &&
				formData.selectedGithubAppId &&
				formData.selectedGithubAppId !== "new"
					? formData.selectedGithubAppId
					: undefined,
			dockerfilePath:
				formData.sourceType === "DOCKERFILE"
					? formData.dockerfilePath.trim()
					: formData.sourceType === "GIT" &&
							formData.gitBuildMethod === "DOCKERFILE_PATH"
						? formData.dockerfilePathForGit.trim()
						: undefined,
			image:
				formData.sourceType === "DOCKER_IMAGE"
					? `${formData.imageName.trim()}:${(formData.imageTag || "latest").trim()}`
					: undefined,
			installCommand: formData.overrideInstallCommand
				? formData.installCommand.trim()
				: undefined,
			buildCommand: formData.overrideBuildCommand
				? formData.buildCommand.trim()
				: undefined,
			startCommand: formData.overrideStartCommand
				? formData.startCommand.trim()
				: undefined,
			envVars: filteredEnvVars.length > 0 ? filteredEnvVars : undefined,
			cpuLimit: formData.cpuLimit,
			memoryLimit: formData.memoryLimit,
		});
	};

	const goNext = () => {
		if (stepIndex < visibleSteps.length - 1) setStepIndex((c) => c + 1);
	};
	const goBack = () => {
		if (stepIndex > 0) setStepIndex((c) => c - 1);
	};

	const resetDialog = () => {
		setStepIndex(0);
		setFormError("");
		setFormData(INITIAL_FORM_DATA);
	};

	return (
		<Dialog
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) resetDialog();
			}}
			open={open}
		>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="gap-0 overflow-hidden border border-border/50 bg-background/80 p-0 backdrop-blur-xl sm:max-w-3xl">
				<DialogHeader className="border-border/50 border-b px-5 pt-4 pb-3">
					<DialogTitle>Create New Project</DialogTitle>
				</DialogHeader>

				<ProjectFormContext.Provider
					value={{
						formData,
						updateForm,
						stepIndex,
						setStepIndex,
						setFormError,
					}}
				>
					<div className="scrollbar-thin scrollbar-thumb-border h-[80vh] space-y-4 overflow-y-auto bg-card/10 p-5">
						{/* Step indicator */}
						<div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/20 px-4 py-3 shadow-sm">
							<div className="font-semibold text-primary">{currentStep}</div>
							<div className="flex items-center gap-2.5">
								{visibleSteps.map((label, index) => (
									<div
										className={cn(
											"h-2 w-2 rounded-full transition-all duration-300",
											index === stepIndex && "w-6 bg-primary",
											index < stepIndex && "bg-primary/60",
											index > stepIndex && "bg-border",
										)}
										key={label}
									/>
								))}
							</div>
						</div>

						{/* Step Content */}
						<div className="fade-in slide-in-from-bottom-2 animate-in pb-4 duration-300">
							{currentStep === "Source" && <SourceStep />}
							{currentStep === "Build" && <BuildStep />}
							{currentStep === "Runtime" && <RuntimeStep />}
							{currentStep === "Environment" && <EnvironmentStep />}
							{currentStep === "Summary" && <SummaryStep />}
						</div>

						{formError && (
							<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 font-medium text-destructive text-sm">
								{formError}
							</div>
						)}
					</div>
				</ProjectFormContext.Provider>

				<DialogFooter className="border-border/50 border-t bg-card/30 px-5 py-4">
					<div className="flex w-full items-center justify-between">
						<DialogClose asChild>
							<Button
								className="hover:bg-muted/50"
								type="button"
								variant="ghost"
							>
								Cancel
							</Button>
						</DialogClose>
						<div className="flex gap-2">
							{stepIndex > 0 && (
								<Button onClick={goBack} type="button" variant="outline">
									Back
								</Button>
							)}
							{stepIndex < visibleSteps.length - 1 ? (
								<Button disabled={!canProceed} onClick={goNext} type="button">
									Continue
								</Button>
							) : (
								<Button
									className="shadow-lg shadow-primary/20"
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
										"Deploy Project"
									)}
								</Button>
							)}
						</div>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
