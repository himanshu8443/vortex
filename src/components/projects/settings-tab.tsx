"use client";

import type { inferRouterOutputs } from "@trpc/server";
import { Box, GitBranch, Rocket, Terminal, X } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { StatusBanner } from "@/components/ui/status-banner";
import {
	getAvailableCpuOptions,
	getAvailableMemoryOptions,
} from "@/lib/resource-options";
import type { AppRouter } from "@/server/api/root";
import { api } from "@/trpc/react";

type ProjectData =
	inferRouterOutputs<AppRouter>["project"]["getProjectById"]["data"];

interface SettingsTabProps {
	project: ProjectData;
	onRedeploy: () => void;
}

// The shape of editable fields we track
interface FormState {
	repoUrl: string;
	branch: string;
	rootDirectory: string;
	dockerfilePath: string;
	installCommand: string | null;
	buildCommand: string | null;
	startCommand: string | null;
	cpuLimit: string;
	memoryLimit: string;
}

function getInitialForm(project: ProjectData): FormState {
	return {
		repoUrl: project.repoUrl ?? "",
		branch: project.branch ?? "main",
		rootDirectory: project.rootDirectory ?? "/",
		dockerfilePath: project.dockerfilePath ?? "Dockerfile",
		installCommand: project.installCommand ?? null,
		buildCommand: project.buildCommand ?? null,
		startCommand: project.startCommand ?? null,
		cpuLimit: project.cpuLimit ?? "0.5",
		memoryLimit: project.memoryLimit ?? "512m",
	};
}

function hasFormChanged(current: FormState, initial: FormState): boolean {
	return (
		current.repoUrl !== initial.repoUrl ||
		current.branch !== initial.branch ||
		current.rootDirectory !== initial.rootDirectory ||
		current.dockerfilePath !== initial.dockerfilePath ||
		current.installCommand !== initial.installCommand ||
		current.buildCommand !== initial.buildCommand ||
		current.startCommand !== initial.startCommand ||
		current.cpuLimit !== initial.cpuLimit ||
		current.memoryLimit !== initial.memoryLimit
	);
}

// ─── Reusable read-only display ───────────────────────────────
function ReadOnlyField({ label, value }: { label: string; value: string }) {
	return (
		<div className="grid gap-1">
			<Label className="text-muted-foreground">{label}</Label>
			<p className="rounded-md border border-border/40 bg-muted/20 px-3 py-2 font-mono text-sm">
				{value}
			</p>
		</div>
	);
}

// ─── Command toggle field ─────────────────────────────────────
function CommandToggle({
	label,
	placeholder,
	value,
	onChange,
}: {
	label: string;
	placeholder: string;
	value: string | null;
	onChange: (val: string | null) => void;
}) {
	const isEnabled = value !== null;

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<Label>{label}</Label>
				<Switch
					checked={isEnabled}
					onCheckedChange={(checked) => {
						onChange(checked ? "" : null);
					}}
				/>
			</div>
			{isEnabled && (
				<Input
					className="font-mono text-sm"
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					value={value}
				/>
			)}
		</div>
	);
}

// ─── Redeploy Toast ───────────────────────────────────────────
function RedeployToast({
	open,
	onRedeploy,
	onDismiss,
}: {
	open: boolean;
	onRedeploy: () => void;
	onDismiss: () => void;
}) {
	if (!open) return null;
	return (
		<div className="slide-in-from-right-5 fade-in-0 fixed top-6 right-6 z-50 flex animate-in items-center gap-3 rounded-xl border border-border/50 bg-background/90 p-4 shadow-lg backdrop-blur-md">
			<div className="flex items-center gap-2">
				<Rocket className="h-4 w-4 text-primary" />
				<div>
					<p className="font-semibold text-sm">Settings saved!</p>
					<p className="text-muted-foreground text-xs">
						Redeploy to apply changes.
					</p>
				</div>
			</div>
			<div className="flex items-center gap-1.5">
				<Button onClick={onRedeploy} size="sm">
					Redeploy
				</Button>
				<Button onClick={onDismiss} size="sm" variant="ghost">
					<X className="h-3.5 w-3.5" />
				</Button>
			</div>
		</div>
	);
}

// ─── Main Component ───────────────────────────────────────────
export function SettingsTab({ project, onRedeploy }: SettingsTabProps) {
	const isGit = project.sourceType === "GIT";
	const isDockerRegistry = project.sourceType === "DOCKER_REGISTRY";
	const isNixpacks = project.buildType === "NIXPACKS";
	const isDockerfile = project.buildType === "DOCKERFILE";

	// Host resource limits
	const { data: hostResources } = api.project.getHostResources.useQuery(
		undefined,
		{ staleTime: 60_000 },
	);
	const cpuOptions = getAvailableCpuOptions(hostResources?.cpuCount ?? 1);
	const memoryOptions = getAvailableMemoryOptions(
		hostResources?.totalMemoryBytes ?? 512 * 1024 * 1024,
	);

	const initial = React.useMemo(() => getInitialForm(project), [project]);
	const [form, setForm] = React.useState<FormState>(initial);
	const [isSaving, setIsSaving] = React.useState(false);
	const [showRedeployToast, setShowRedeployToast] = React.useState(false);

	// Sync form when project data changes (e.g. after refetch)
	React.useEffect(() => {
		setForm(getInitialForm(project));
	}, [project]);

	const isDirty = hasFormChanged(form, initial);

	// Fetch branches for the current repo URL
	const { data: branches } = api.project.fetchBranches.useQuery(
		{ repoUrl: form.repoUrl },
		{
			enabled: isGit && form.repoUrl.length > 5,
			staleTime: 60_000,
		},
	);

	const utils = api.useUtils();
	const updateProject = api.project.updateProject.useMutation({
		onSuccess: () => {
			void utils.project.getProjectById.invalidate({
				projectId: project.id,
			});
			setIsSaving(false);
			setShowRedeployToast(true);
		},
		onError: () => {
			setIsSaving(false);
		},
	});

	const handleSave = () => {
		setIsSaving(true);

		updateProject.mutate({
			projectId: project.id,
			...(form.repoUrl !== initial.repoUrl && { repoUrl: form.repoUrl }),
			...(form.branch !== initial.branch && { branch: form.branch }),
			...(form.rootDirectory !== initial.rootDirectory && {
				rootDirectory: form.rootDirectory,
			}),
			...(form.dockerfilePath !== initial.dockerfilePath && {
				dockerfilePath: form.dockerfilePath,
			}),
			...(form.installCommand !== initial.installCommand && {
				installCommand: form.installCommand,
			}),
			...(form.buildCommand !== initial.buildCommand && {
				buildCommand: form.buildCommand,
			}),
			...(form.startCommand !== initial.startCommand && {
				startCommand: form.startCommand,
			}),
			...(form.cpuLimit !== initial.cpuLimit && { cpuLimit: form.cpuLimit }),
			...(form.memoryLimit !== initial.memoryLimit && {
				memoryLimit: form.memoryLimit,
			}),
		});
	};

	const handleDiscard = () => {
		setForm(initial);
	};

	const handleRedeploy = () => {
		setShowRedeployToast(false);
		onRedeploy();
	};

	const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
		setForm((prev) => ({ ...prev, [key]: value }));
	};

	return (
		<>
			<div className="space-y-6">
				<div>
					<h2 className="font-semibold text-lg">Configuration</h2>
					<p className="text-muted-foreground text-sm">
						Project settings and build configuration.
					</p>
				</div>

				<div className="grid gap-6 md:grid-cols-2">
					{/* ─── Source Card ─────────────────────── */}
					<GlassCard className="flex flex-col gap-4 md:col-span-2 lg:col-span-1">
						<div className="flex items-center gap-3">
							<div className="rounded-lg bg-primary/10 p-2 text-primary">
								<GitBranch className="h-5 w-5" />
							</div>
							<div>
								<h3 className="font-medium">Source</h3>
								<p className="text-muted-foreground text-sm">
									Repository or image configuration.
								</p>
							</div>
						</div>

						<div className="space-y-3">
							{/* Source Type — always shown, read-only */}
							<ReadOnlyField label="Source Type" value={project.sourceType} />

							{/* Docker Registry — show image, read-only */}
							{isDockerRegistry && (
								<ReadOnlyField
									label="Image"
									value={project.image ?? "-"}
								/>
							)}

							{/* Git source — editable repo URL */}
							{isGit && (
								<>
									<div className="grid gap-1">
										<Label>Repository URL</Label>
										<Input
											className="font-mono text-sm"
											onChange={(e) => update("repoUrl", e.target.value)}
											placeholder="https://github.com/user/repo"
											value={form.repoUrl}
										/>
									</div>

									<div className="grid grid-cols-2 gap-3">
										<div className="grid gap-1">
											<Label>Branch</Label>
											{branches && branches.length > 0 ? (
												<Select
													onValueChange={(v) => update("branch", v)}
													value={form.branch}
												>
													<SelectTrigger className="w-full font-mono text-sm">
														<SelectValue placeholder="Select branch" />
													</SelectTrigger>
													<SelectContent>
														{branches.map((b: string) => (
															<SelectItem key={b} value={b}>
																{b}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											) : (
												<Input
													className="font-mono text-sm"
													onChange={(e) => update("branch", e.target.value)}
													placeholder="main"
													value={form.branch}
												/>
											)}
										</div>

										{/* Root dir — only for Nixpacks */}
										{isNixpacks && (
											<div className="grid gap-1">
												<Label>Root Directory</Label>
												<Input
													className="font-mono text-sm"
													onChange={(e) =>
														update("rootDirectory", e.target.value)
													}
													placeholder="/"
													value={form.rootDirectory}
												/>
											</div>
										)}
									</div>

									{/* Dockerfile path — only for git+dockerfile */}
									{isDockerfile && (
										<div className="grid gap-1">
											<Label>Dockerfile Path</Label>
											<Input
												className="font-mono text-sm"
												onChange={(e) =>
													update("dockerfilePath", e.target.value)
												}
												placeholder="Dockerfile"
												value={form.dockerfilePath}
											/>
										</div>
									)}
								</>
							)}
						</div>
					</GlassCard>

					{/* ─── Resources Card ─────────────────── */}
					<GlassCard className="flex flex-col gap-4 md:col-span-2 lg:col-span-1">
						<div className="flex items-center gap-3">
							<div className="rounded-lg bg-orange-500/10 p-2 text-orange-500">
								<Box className="h-5 w-5" />
							</div>
							<div>
								<h3 className="font-medium">Resources</h3>
								<p className="text-muted-foreground text-sm">
									Runtime resource limits.
								</p>
							</div>
						</div>

						<div className="space-y-3">
							<div className="grid gap-1">
								<Label>CPU Limit</Label>
								<Select
									onValueChange={(v) => update("cpuLimit", v)}
									value={form.cpuLimit}
								>
									<SelectTrigger className="w-full font-mono text-sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{cpuOptions.map((opt) => (
											<SelectItem key={opt.value} value={opt.value}>
												{opt.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="grid gap-1">
								<Label>Memory Limit</Label>
								<Select
									onValueChange={(v) => update("memoryLimit", v)}
									value={form.memoryLimit}
								>
									<SelectTrigger className="w-full font-mono text-sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{memoryOptions.map((opt) => (
											<SelectItem key={opt.value} value={opt.value}>
												{opt.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</GlassCard>

					{/* ─── Build Commands Card (only for Nixpacks) ─── */}
					{isGit && isNixpacks && (
						<GlassCard className="flex flex-col gap-4 md:col-span-2">
							<div className="flex items-center gap-3">
								<div className="rounded-lg bg-blue-500/10 p-2 text-blue-500">
									<Terminal className="h-5 w-5" />
								</div>
								<div>
									<h3 className="font-medium">Build Commands</h3>
									<p className="text-muted-foreground text-sm">
										Override auto-detected commands. Enable a toggle to set a
										custom command.
									</p>
								</div>
							</div>

							<div className="grid gap-4 md:grid-cols-1">
								<CommandToggle
									label="Install Command"
									onChange={(v) => update("installCommand", v)}
									placeholder="npm install"
									value={form.installCommand}
								/>
								<CommandToggle
									label="Build Command"
									onChange={(v) => update("buildCommand", v)}
									placeholder="npm run build"
									value={form.buildCommand}
								/>
								<CommandToggle
									label="Start Command"
									onChange={(v) => update("startCommand", v)}
									placeholder="npm start"
									value={form.startCommand}
								/>
							</div>
						</GlassCard>
					)}

					{/* Build Type — read-only, shown for all except docker registry */}
					{!isDockerRegistry && (
						<GlassCard className="flex flex-col gap-4 md:col-span-2">
							<div className="flex items-center gap-3">
								<div className="rounded-lg bg-blue-500/10 p-2 text-blue-500">
									<Terminal className="h-5 w-5" />
								</div>
								<div>
									<h3 className="font-medium">Build Info</h3>
									<p className="text-muted-foreground text-sm">
										Build strategy for this project.
									</p>
								</div>
							</div>
							<ReadOnlyField
								label="Build Type"
								value={project.buildType ?? "-"}
							/>
						</GlassCard>
					)}

					{isDockerRegistry && (
						<GlassCard className="flex flex-col gap-4 md:col-span-2">
							<div className="flex items-center gap-3">
								<div className="rounded-lg bg-blue-500/10 p-2 text-blue-500">
									<Terminal className="h-5 w-5" />
								</div>
								<div>
									<h3 className="font-medium">Build</h3>
									<p className="text-muted-foreground text-sm">
										No build step. This project runs directly from the selected
										image.
									</p>
								</div>
							</div>
						</GlassCard>
					)}
				</div>
			</div>

			{/* ─── Unsaved Changes Banner ─────────────── */}
			<StatusBanner
				loading={isSaving}
				onAction={handleSave}
				onCancel={handleDiscard}
				open={isDirty}
			/>

			{/* ─── Redeploy Toast ─────────────────────── */}
			<RedeployToast
				onDismiss={() => setShowRedeployToast(false)}
				onRedeploy={handleRedeploy}
				open={showRedeployToast}
			/>
		</>
	);
}
