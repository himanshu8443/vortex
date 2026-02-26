"use client";

import { Loader2, Rocket } from "lucide-react";
import {
	useParams,
	usePathname,
	useRouter,
	useSearchParams,
} from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { DangerZoneTab } from "@/components/projects/danger-zone-tab";
import { DeploymentsTab } from "@/components/projects/deployments-tab";
import { EnvTab } from "@/components/projects/env-tab";
import { LogsTab } from "@/components/projects/logs-tab";
import { ProjectHeader } from "@/components/projects/project-header";
import { SettingsTab } from "@/components/projects/settings-tab";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBanner } from "@/components/ui/status-banner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/trpc/react";

const fallbackVariables = [{ key: "", value: "" }];
const tabValues = ["settings", "deployments", "logs", "env", "danger"] as const;

type ProjectTab = (typeof tabValues)[number];

function isProjectTab(value: string | null): value is ProjectTab {
	return value !== null && tabValues.includes(value as ProjectTab);
}

function mapProjectStatus(
	status: string | null,
): "online" | "building" | "offline" {
	if (status === "RUNNING") return "online";
	if (
		status === "STARTING" ||
		status === "DEPLOYING" ||
		status === "BUILDING"
	) {
		return "building";
	}
	return "offline";
}

function getUpdatedAtLabel(dateValue: Date | null) {
	if (!dateValue) return "just now";
	const diffMs = Date.now() - new Date(dateValue).getTime();
	const diffMinutes = Math.floor(diffMs / 60000);
	if (diffMinutes < 1) return "just now";
	if (diffMinutes < 60) return `${diffMinutes}m ago`;
	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) return `${diffHours}h ago`;
	const diffDays = Math.floor(diffHours / 24);
	return `${diffDays}d ago`;
}

export default function ProjectPage() {
	const params = useParams();
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const projectId = params.id as string;
	const tabFromQuery = searchParams.get("tab");
	const activeTab: ProjectTab = isProjectTab(tabFromQuery)
		? tabFromQuery
		: "settings";

	const {
		data: projectResponse,
		isLoading,
		error,
		refetch,
	} = api.project.getProjectById.useQuery(
		{ projectId },
		{ enabled: !!projectId, refetchInterval: 3000 },
	);

	const deleteProject = api.project.deleteProject.useMutation({
		onSuccess: () => {
			toast.success("Project deleted successfully");
			window.location.href = "/";
		},
		onError: (err) => {
			toast.error(err.message || "Failed to delete project");
		},
	});

	const redeployProject = api.project.redeploy.useMutation({
		onSuccess: () => {
			toast.success("Redeployment triggered successfully");
			void refetch();
		},
		onError: (err) => {
			toast.error(err.message || "Failed to trigger redeployment");
		},
	});

	const restartProject = api.project.restart.useMutation({
		onSuccess: () => {
			toast.success("Project restarted successfully");
			void refetch();
		},
		onError: (err) => {
			toast.error(err.message || "Failed to restart project");
		},
	});

	const project = projectResponse?.data;

	const initialVariables = React.useMemo(() => {
		if (!project?.envVars) return fallbackVariables;
		try {
			const parsed = JSON.parse(project.envVars) as Array<{
				key: string;
				value: string;
			}>;
			if (!Array.isArray(parsed) || parsed.length === 0)
				return fallbackVariables;
			return parsed.map((entry) => ({
				key: entry.key ?? "",
				value: entry.value ?? "",
			}));
		} catch {
			return fallbackVariables;
		}
	}, [project?.envVars]);

	// State for unsaved changes banner
	const [hasChanges, setHasChanges] = React.useState(false);
	const [variables, setVariables] = React.useState(fallbackVariables);

	const handleTabChange = React.useCallback(
		(value: string) => {
			if (!isProjectTab(value)) return;

			const nextParams = new URLSearchParams(searchParams.toString());
			nextParams.set("tab", value);

			router.replace(`${pathname}?${nextParams.toString()}`, {
				scroll: false,
			});
		},
		[pathname, router, searchParams],
	);

	React.useEffect(() => {
		setVariables(initialVariables);
	}, [initialVariables]);

	// Simulation of making changes
	const handleInputChange = () => {
		setHasChanges(true);
	};

	const handleSave = () => {
		// Simulate saving
		setTimeout(() => {
			setHasChanges(false);
		}, 1000);
	};

	// Redeploy dialog state
	const [redeployDialogOpen, setRedeployDialogOpen] = React.useState(false);
	const [noCache, setNoCache] = React.useState(false);

	const handleDelete = () => {
		void deleteProject.mutateAsync({ projectId });
	};

	const openRedeployDialog = () => {
		setNoCache(false);
		setRedeployDialogOpen(true);
	};

	const handleRedeploy = () => {
		setRedeployDialogOpen(false);
		void redeployProject.mutateAsync({ projectId, noCache });
	};

	const handleRestart = () => {
		void restartProject.mutateAsync({ projectId });
	};

	const handleDiscard = () => {
		setHasChanges(false);
		setVariables([...initialVariables]);
	};

	if (isLoading) {
		return (
			<div className="min-h-screen pb-20">
				<div className="border-border/40 border-b bg-card/40 px-6 py-8">
					<div className="container mx-auto max-w-6xl">
						<div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
							<div className="flex items-center gap-4">
								<Skeleton className="h-12 w-12 rounded-xl" />
								<div className="space-y-2">
									<Skeleton className="h-6 w-48" />
									<div className="flex items-center gap-2">
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-4 w-32" />
									</div>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<Skeleton className="h-9 w-24" />
								<Skeleton className="h-9 w-24" />
							</div>
						</div>
					</div>
				</div>
				<main className="container mx-auto mt-8 max-w-6xl px-4 md:px-6">
					<div className="flex gap-4 border-border/40 border-b pb-2">
						<Skeleton className="h-6 w-24" />
						<Skeleton className="h-6 w-24" />
						<Skeleton className="h-6 w-24" />
					</div>
					<div className="mt-8 grid gap-6 md:grid-cols-2">
						<Skeleton className="h-64 w-full rounded-xl" />
						<Skeleton className="h-64 w-full rounded-xl" />
					</div>
				</main>
			</div>
		);
	}

	if (error || !project) {
		return (
			<div className="container mx-auto mt-10 max-w-6xl space-y-3 px-4 md:px-6">
				<div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive text-sm">
					Failed to load project details.
				</div>
				<Button onClick={() => void refetch()} size="sm" variant="outline">
					Retry
				</Button>
			</div>
		);
	}

	const primaryDomain =
		project?.ports
			?.map((port) => port.domain)
			.filter((domain) => domain !== null) ?? [];
	const repoDisplay = project.repoUrl ?? project.image ?? "manual";

	return (
		<div className="min-h-screen pb-20">
			<ProjectHeader
				branch={project.branch ?? "main"}
				domains={primaryDomain}
				gitRepo={repoDisplay}
				isRedeploying={redeployProject.isPending}
				isRestarting={restartProject.isPending}
				lastUpdated={getUpdatedAtLabel(
					project.updatedAt ?? project.createdAt ?? null,
				)}
				onRedeploy={openRedeployDialog}
				onRestart={handleRestart}
				projectName={project.name}
				status={mapProjectStatus(project.status)}
			/>

			<main className="container mx-auto mt-8 max-w-6xl px-4 md:px-6">
				<Tabs
					className="w-full space-y-8"
					onValueChange={handleTabChange}
					orientation="horizontal"
					value={activeTab}
				>
					<TabsList
						className="h-auto w-full justify-start rounded-none border-border/40 border-b bg-transparent p-0 pb-1"
						variant="line"
					>
						<TabsTrigger
							className="rounded-none border-transparent border-b-2 px-4 pt-2 pb-3 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
							value="settings"
						>
							Configuration
						</TabsTrigger>
						<TabsTrigger
							className="rounded-none border-transparent border-b-2 px-4 pt-2 pb-3 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
							value="deployments"
						>
							Deployments
						</TabsTrigger>
						<TabsTrigger
							className="rounded-none border-transparent border-b-2 px-4 pt-2 pb-3 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
							value="logs"
						>
							Logs
						</TabsTrigger>
						<TabsTrigger
							className="rounded-none border-transparent border-b-2 px-4 pt-2 pb-3 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
							value="env"
						>
							Environment
						</TabsTrigger>
						<TabsTrigger
							className="rounded-none border-transparent border-b-2 px-4 pt-2 pb-3 font-medium text-destructive hover:text-destructive/80 data-[state=active]:border-destructive data-[state=active]:bg-transparent data-[state=active]:shadow-none"
							value="danger"
						>
							Danger Zone
						</TabsTrigger>
					</TabsList>

					<TabsContent value="deployments">
						<DeploymentsTab project={project} />
					</TabsContent>

					<TabsContent value="logs">
						<LogsTab
							latestDeploymentId={project.activeDeploymentId}
							projectId={projectId}
							status={project.status}
						/>
					</TabsContent>

					<TabsContent value="settings">
						<SettingsTab onRedeploy={openRedeployDialog} project={project} />
					</TabsContent>

					<TabsContent value="env">
						<EnvTab onInputChange={handleInputChange} variables={variables} />
					</TabsContent>

					<TabsContent value="danger">
						<DangerZoneTab
							isDeleting={deleteProject.isPending}
							onDelete={handleDelete}
							projectName={project.name}
						/>
					</TabsContent>
				</Tabs>
			</main>

			<StatusBanner
				loading={false}
				onAction={handleSave}
				onCancel={handleDiscard}
				open={hasChanges}
			/>

			{/* Redeploy Confirmation Dialog */}
			<Dialog onOpenChange={setRedeployDialogOpen} open={redeployDialogOpen}>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Rocket className="h-5 w-5 text-primary" />
							Redeploy Project
						</DialogTitle>
						<DialogDescription>
							This will trigger a new deployment for{" "}
							<strong className="text-foreground">{project.name}</strong>.
						</DialogDescription>
					</DialogHeader>

					<div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
						<div className="space-y-0.5">
							<Label
								className="cursor-pointer font-medium text-sm"
								htmlFor="no-cache"
							>
								No Cache
							</Label>
							<p className="text-muted-foreground text-xs">
								Build without using Docker layer cache
							</p>
						</div>
						<Switch
							checked={noCache}
							id="no-cache"
							onCheckedChange={setNoCache}
						/>
					</div>

					<DialogFooter className="gap-2 space-x-4 pt-2 sm:gap-0">
						<Button
							onClick={() => setRedeployDialogOpen(false)}
							type="button"
							variant="outline"
						>
							Cancel
						</Button>
						<Button
							disabled={redeployProject.isPending}
							onClick={handleRedeploy}
							type="button"
						>
							{redeployProject.isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Deploying...
								</>
							) : (
								"Redeploy"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
