"use client";

import {
	createRuntimePortEntry,
	type RuntimePortEntry,
} from "@/components/create-project/types";
import type { inferRouterOutputs } from "@trpc/server";
import { Box, GitBranch, GlobeIcon, Rocket, Terminal, X } from "lucide-react";
import * as React from "react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { StatusBanner } from "@/components/ui/status-banner";
import { Switch } from "@/components/ui/switch";
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
	name: string;
	repoUrl: string;
	branch: string;
	rootDirectory: string;
	dockerfilePath: string;
	installCommand: string | null;
	buildCommand: string | null;
	startCommand: string | null;
	cpuLimit: string;
	memoryLimit: string;
	buildType: string;
	runtimePorts: RuntimePortEntry[];
}

function getInitialForm(project: ProjectData): FormState {
	return {
		name: project.name ?? "",
		repoUrl: project.repoUrl ?? "",
		branch: project.branch ?? "main",
		rootDirectory: project.rootDirectory ?? "/",
		dockerfilePath: project.dockerfilePath ?? "Dockerfile",
		installCommand: project.installCommand ?? null,
		buildCommand: project.buildCommand ?? null,
		startCommand: project.startCommand ?? null,
		cpuLimit: project.cpuLimit ?? "0.5",
		memoryLimit: project.memoryLimit ?? "512m",
		buildType: project.buildType ?? "DOCKERFILE",
		runtimePorts:
			project.ports && project.ports.length > 0
				? project.ports.map((p) => ({
						id: p.id,
						port: p.port ? p.port.toString() : "",
						domain: p.domain ?? "",
						exposedPort: p.exposedPort ? p.exposedPort.toString() : "",
					}))
				: [createRuntimePortEntry("init")],
	};
}

function hasFormChanged(current: FormState, initial: FormState): boolean {
	return (
		current.name !== initial.name ||
		current.repoUrl !== initial.repoUrl ||
		current.branch !== initial.branch ||
		current.rootDirectory !== initial.rootDirectory ||
		current.dockerfilePath !== initial.dockerfilePath ||
		current.installCommand !== initial.installCommand ||
		current.buildCommand !== initial.buildCommand ||
		current.startCommand !== initial.startCommand ||
		current.cpuLimit !== initial.cpuLimit ||
		current.memoryLimit !== initial.memoryLimit ||
		current.buildType !== initial.buildType ||
		JSON.stringify(current.runtimePorts) !== JSON.stringify(initial.runtimePorts)
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

	// Host resource limits
	const { data: hostResources } = api.project.getHostResources.useQuery(
		undefined,
		{ staleTime: 60_000 },
	);
	const cpuOptions = getAvailableCpuOptions(hostResources?.cpuCount ?? 1);
	const memoryOptions = getAvailableMemoryOptions(
		hostResources?.totalMemoryBytes ?? 512 * 1024 * 1024,
	);

	const [initial, setInitial] = React.useState<FormState>(() => getInitialForm(project));
	const [form, setForm] = React.useState<FormState>(initial);
	const [isSaving, setIsSaving] = React.useState(false);
	const [showRedeployToast, setShowRedeployToast] = React.useState(false);
	const [formError, setFormError] = React.useState("");

	const runtimePortIdRef = React.useRef(Date.now());
	const nextRuntimePortId = () => `runtime-port-${runtimePortIdRef.current++}`;

	const isNixpacks = form.buildType === "NIXPACKS";
	const isDockerfile = form.buildType === "DOCKERFILE";

	// Sync form when project data changes (e.g. after refetch for polling)
	React.useEffect(() => {
		const newInitial = getInitialForm(project);
		setInitial((prevInitial) => {
			setForm((prevForm) => {
				// Only overwrite the user's form if they haven't made any unsaved changes
				if (!hasFormChanged(prevForm, prevInitial)) {
					return newInitial;
				}
				return prevForm;
			});
			return newInitial;
		});
	}, [project]);

	const isDirty = hasFormChanged(form, initial);

	// Metrics state
	const [metricsData, setMetricsData] = React.useState<
		Array<{ time: string; cpu: number; memory: number }>
	>([]);

	api.project.streamMetrics.useSubscription(
		{ projectId: project.id },
		{
			enabled: project.status === "RUNNING",
			onData(data) {
				setMetricsData((prev) => {
					const now = new Date();
					const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
					const newData = [
						...prev,
						{
							time: timeStr,
							cpu: parseFloat(data.cpu),
							memory: data.memory / (1024 * 1024),
						},
					];
					if (newData.length > 20) {
						newData.shift();
					}
					return newData;
				});
			},
		},
	);

	// Fetch branches for the current repo URL
	const { data: branches, isLoading: isLoadingBranches } = api.project.fetchBranches.useQuery(
		{ 
			repoUrl: form.repoUrl,
			githubAppId: project.githubAppId ?? undefined,
		},
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
			toast.success("Project settings saved");
			setShowRedeployToast(true);
		},
		onError: (error) => {
			setFormError(error.message || "Failed to update project");
			toast.error(error.message || "Failed to update project");
			setIsSaving(false);
		},
	});

	const handleSave = () => {
		setFormError("");

		// Validate Ports Structure
		const portsData = form.runtimePorts
			.filter((entry) => entry.port.trim() && (entry.domain.trim() || entry.exposedPort.trim()))
			.map((entry) => {
				let domain: string | undefined = entry.domain.trim() || undefined;
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
						setFormError("Domain must simply be a domain without a path");
						return;
					}
				} catch {
					setFormError(`Invalid domain format for port ${item.port}`);
					return;
				}
			}
		}

		setIsSaving(true);
		
		updateProject.mutate({
			projectId: project.id,
			...(form.name !== initial.name && { name: form.name }),
			...(JSON.stringify(form.runtimePorts) !== JSON.stringify(initial.runtimePorts) && { portsData }),
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
			...(form.buildType !== initial.buildType && {
				buildType: form.buildType as "DOCKERFILE" | "COMPOSE" | "NIXPACKS",
			}),
		}, {
			onSuccess: () => {
				setInitial(form);
			}
		});
	};

	const handleDiscard = () => {
		setFormError("");
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
                
				{formError && (
					<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 font-medium text-destructive text-sm">
						{formError}
					</div>
				)}

				<div className="grid gap-6 md:grid-cols-2">
					{/* ─── General Card ─────────────────────── */}
					<GlassCard className="flex flex-col gap-4 md:col-span-2">
						<div className="flex items-center gap-3">
							<div className="rounded-lg bg-primary/10 p-2 text-primary">
								<Terminal className="h-5 w-5" />
							</div>
							<div>
								<h3 className="font-medium">General</h3>
								<p className="text-muted-foreground text-sm">
									Project identification.
								</p>
							</div>
						</div>

						<div className="grid gap-1">
							<Label>Project Name</Label>
							<Input
								className="font-mono text-sm max-w-sm"
								onChange={(e) => update("name", e.target.value)}
								placeholder="my-awesome-app"
								value={form.name}
							/>
						</div>
					</GlassCard>

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
								<ReadOnlyField label="Image" value={project.image ?? "-"} />
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
											{isLoadingBranches || (branches && branches.length > 0) ? (
												<Select
													disabled={isLoadingBranches}
													onValueChange={(v) => update("branch", v)}
													value={form.branch}
												>
													<SelectTrigger className="w-full font-mono text-sm">
														<SelectValue placeholder={isLoadingBranches ? "Loading branches..." : "Select branch"} />
													</SelectTrigger>
													<SelectContent>
														{Array.from(new Set([form.branch, ...(branches || [])]))
															.filter(Boolean)
															.map((b: string) => (
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

									{/* Build Method Picker */}
									<div className="space-y-3 border-b border-border/50 pb-4 pt-1">
										<Label className="font-medium text-sm">Build Method</Label>
										<div className="grid gap-3 md:grid-cols-2">
											<button
												className={cn(
													"group relative overflow-hidden rounded-md border border-border/60 bg-card/20 p-3 text-left shadow-sm transition-all duration-300 hover:border-primary/30 hover:bg-muted/30 hover:shadow-md",
													isNixpacks
														? "border-primary/50 bg-primary/5 shadow-primary/10 ring-1 ring-primary/20"
														: "opacity-80 hover:opacity-100",
												)}
												onClick={() => update("buildType", "NIXPACKS")}
												type="button"
											>
												<div className="font-medium text-sm transition-colors group-hover:text-primary">
													<span
														className={cn(
															isNixpacks
																? "text-primary"
																: "text-foreground",
														)}
													>
														Auto Detect (Nixpacks)
													</span>
												</div>
												{isNixpacks && (
													<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
												)}
											</button>
											<button
												className={cn(
													"group relative overflow-hidden rounded-lg border border-border/60 bg-card/20 p-3 text-left shadow-sm transition-all duration-300 hover:border-primary/30 hover:bg-muted/30 hover:shadow-md",
													isDockerfile
														? "border-primary/50 bg-primary/5 shadow-primary/10 ring-1 ring-primary/20"
														: "opacity-80 hover:opacity-100",
												)}
												onClick={() => update("buildType", "DOCKERFILE")}
												type="button"
											>
												<div className="font-medium text-sm transition-colors group-hover:text-primary">
													<span
														className={cn(
															isDockerfile
																? "text-primary"
																: "text-foreground",
														)}
													>
														Dockerfile Path
													</span>
												</div>
												{isDockerfile && (
													<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
												)}
											</button>
										</div>
									</div>

									{/* Dockerfile path — only for git+dockerfile */}
									{isDockerfile && (
										<div className="grid gap-1 pt-2">
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
						<div className="flex items-center gap-2">
							<div className="rounded-md bg-orange-500/10 p-1.5 text-orange-500">
								<Box className="h-4 w-4" />
							</div>
							<h3 className="font-medium">Resources</h3>
						</div>

						<div className="grid grid-cols-2 gap-3">
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

						{project.status === "RUNNING" && metricsData.length > 0 && (
							<div className="mt-2 space-y-4 border-t border-border/50 pt-4">
								<div>
									<Label className="mb-2 block text-xs text-muted-foreground">
										CPU Usage (%)
									</Label>
									<div className="h-28 w-full">
										<ResponsiveContainer height="100%" width="100%">
											<LineChart data={metricsData}>
												<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
												<XAxis dataKey="time" hide />
												<YAxis domain={[0, "dataMax + 10"]} hide />
												<Tooltip
													contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
													itemStyle={{ color: "#fff" }}
													labelStyle={{ color: "rgba(255,255,255,0.7)" }}
												/>
												<Line dataKey="cpu" dot={false} isAnimationActive={false} stroke="#f97316" strokeWidth={2} type="monotone" />
											</LineChart>
										</ResponsiveContainer>
									</div>
								</div>
								<div>
									<Label className="mb-2 block text-xs text-muted-foreground">
										Memory Usage (MB)
									</Label>
									<div className="h-28 w-full">
										<ResponsiveContainer height="100%" width="100%">
											<LineChart data={metricsData}>
												<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
												<XAxis dataKey="time" hide />
												<YAxis domain={[0, "dataMax + 50"]} hide />
												<Tooltip
													contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
													itemStyle={{ color: "#fff" }}
													labelStyle={{ color: "rgba(255,255,255,0.7)" }}
												/>
												<Line dataKey="memory" dot={false} isAnimationActive={false} stroke="#3b82f6" strokeWidth={2} type="monotone" />
											</LineChart>
										</ResponsiveContainer>
									</div>
								</div>
							</div>
						)}
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

					
					{/* ─── Ports & Domains Card ─────────────────────── */}
					<GlassCard className="flex flex-col gap-4 md:col-span-2">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-500">
									<GlobeIcon className="h-5 w-5" />
								</div>
								<div>
									<h3 className="font-medium">Ports & Domains</h3>
									<p className="text-muted-foreground text-sm">
										Manage routing and exposed ports.
									</p>
								</div>
							</div>
							<Button
								onClick={() =>
									setForm((prev) => ({
										...prev,
										runtimePorts: [
											...prev.runtimePorts,
											createRuntimePortEntry(nextRuntimePortId()),
										],
									}))
								}
								size="sm"
								type="button"
								variant="secondary"
							>
								Add Port
							</Button>
						</div>

						<div className="space-y-4 pt-2">
							<div className="space-y-2 text-muted-foreground text-xs">
								<div className="grid gap-2 grid-cols-[120px_1fr_130px_60px]">
									<div className="font-medium">Container Port</div>
									<div className="font-medium">Domain</div>
									<div className="font-medium shrink-0">Exposed</div>
									<div className="w-[60px]"></div>
								</div>
							</div>
							<div className="space-y-3">
								{form.runtimePorts.map((entry, index) => (
									<div
										className="fade-in zoom-in-95 grid animate-in gap-2 duration-200 grid-cols-[120px_1fr_130px_60px]"
										key={entry.id}
									>
										<Input
											className="bg-muted/20 font-mono text-sm px-3"
											onChange={(e) => {
												const newPorts = [...form.runtimePorts];
												newPorts[index] = { ...newPorts[index], port: e.target.value } as RuntimePortEntry;
												update("runtimePorts", newPorts);
											}}
											placeholder="3000"
											value={entry.port}
										/>
										<Input
											className="bg-muted/20 font-mono text-sm px-3"
											onChange={(e) => {
												const newPorts = [...form.runtimePorts];
												newPorts[index] = { ...newPorts[index], domain: e.target.value } as RuntimePortEntry;
												update("runtimePorts", newPorts);
											}}
											placeholder="https://app.example.com"
											value={entry.domain}
										/>
										<Input
											className="bg-muted/20 font-mono text-sm px-3"
											onChange={(e) => {
												const newPorts = [...form.runtimePorts];
												newPorts[index] = { ...newPorts[index], exposedPort: e.target.value } as RuntimePortEntry;
												update("runtimePorts", newPorts);
											}}
											placeholder="8080"
											value={entry.exposedPort}
										/>
										<Button
											className="hover:bg-destructive/10 hover:text-destructive px-2"
											onClick={() => {
												update(
													"runtimePorts",
													form.runtimePorts.filter((_, i) => i !== index),
												);
											}}
											type="button"
											variant="outline"
										>
											<X className="h-4 w-4" />
										</Button>
									</div>
								))}
							</div>
						</div>
					</GlassCard>

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
