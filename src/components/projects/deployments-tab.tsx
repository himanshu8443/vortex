"use client";

import type { inferRouterOutputs } from "@trpc/server";
import {
	AlertCircle,
	CheckCircle2,
	ChevronDown,
	Loader2,
	StopCircle,
	Terminal,
} from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";
import type { AppRouter } from "@/server/api/root";
import { api } from "@/trpc/react";

interface DeploymentsTabProps {
	project: inferRouterOutputs<AppRouter>["project"]["getProjectById"]["data"];
}

function mapStatus(status: string) {
	if (status === "READY" || status === "RUNNING") return "ready";
	if (status === "BUILDING" || status === "QUEUED") return "building";
	if (status === "FAILED") return "failed";
	if (status === "SUPERSEDED") return "superseded";
	return "building";
}

function formatDuration(startedAt: Date | null, endedAt: Date | null) {
	if (!startedAt || !endedAt) return "-";
	const seconds = Math.max(
		0,
		Math.floor(
			(new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000,
		),
	);
	const minutes = Math.floor(seconds / 60);
	const remSeconds = seconds % 60;
	return `${minutes}m ${remSeconds}s`;
}

function formatDate(value: Date | null) {
	if (!value) return "-";
	return new Date(value).toLocaleString();
}

function BuildLogsPanel({ deploymentId }: { deploymentId: string }) {
	const [logs, setLogs] = React.useState<string>("");
	const bottomRef = React.useRef<HTMLDivElement>(null);

	const isSubscribed = api.logs.streamDeploymentLogs.useSubscription(
		{ deploymentId },
		{
			enabled: !!deploymentId,
			onData: (chunk) => {
				setLogs((prev) => prev + chunk);
				queueMicrotask(() => {
					bottomRef.current?.scrollIntoView({ behavior: "auto" });
				});
			},
			onError: (error) => {
				console.error("Log stream error:", error);
			},
		},
	);

	if (!isSubscribed && logs === "") {
		return (
			<div className="flex items-center gap-2 px-4 py-6 text-muted-foreground text-xs">
				<Loader2 className="h-3 w-3 animate-spin" />
				Connecting to log stream...
			</div>
		);
	}

	const lines = logs.split(/\r?\n/);

	return (
		<div className="border-border/30 border-t">
			<div className="flex items-center gap-2 bg-black/40 px-4 py-2 text-muted-foreground text-xs">
				<Terminal className="h-3 w-3" />
				Build Logs
			</div>
			<div className="max-h-[40vh] overflow-y-auto bg-black px-4 py-3 font-mono text-green-400 text-xs leading-5">
				{lines.length === 0 ? (
					<div className="text-muted-foreground">No logs yet...</div>
				) : (
					lines.map((line: string, index: number) => (
						<div className="whitespace-pre-wrap" key={`${index}-${line}`}>
							{line || "\u00A0"}
						</div>
					))
				)}
				<div ref={bottomRef} />
			</div>
		</div>
	);
}

export function DeploymentsTab({ project }: DeploymentsTabProps) {
	const [expandedId, setExpandedId] = React.useState<string | null>(null);

	const {
		data: deployments,
	} = api.deployments.getAllDeploymentsByProjectId.useQuery(
		{ projectId: project.id },
		{
			enabled: !!project.id,
			refetchInterval: 5000,
		},
	);

	const toggleExpand = (id: string) => {
		setExpandedId((prev) => (prev === id ? null : id));
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="font-semibold text-lg">Deployments</h2>
					<p className="text-muted-foreground text-sm">
						History of your application builds.
					</p>
				</div>
			</div>

			<GlassCard className="overflow-hidden p-0">
				<div className="flex flex-col">
					{!deployments ||
						(deployments.length === 0 && (
							<div className="p-4 text-muted-foreground text-sm">
								No deployments yet.
							</div>
						))}
					{deployments?.map((deploy, i) => {
						const mappedStatus = mapStatus(deploy.status);
						const isExpanded = expandedId === deploy.id;
						return (
							<div
								className={cn(
									i !== deployments.length - 1 && "border-border/50 border-b",
								)}
								key={deploy.id}
							>
								<button
									className={cn(
										"flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/30",
										isExpanded && "bg-muted/20",
									)}
									onClick={() => toggleExpand(deploy.id)}
									type="button"
								>
									<div className="flex items-center gap-4">
										<div
											className={cn(
												"flex h-8 w-8 items-center justify-center rounded-full border",
												mappedStatus === "ready" &&
													"border-green-500/30 bg-green-500/10 text-green-500",
												mappedStatus === "building" &&
													"animate-pulse border-blue-500/30 bg-blue-500/10 text-blue-500",
												mappedStatus === "failed" &&
													"border-red-500/30 bg-red-500/10 text-red-500",
												mappedStatus === "superseded" &&
													"border-slate-500/30 bg-slate-500/10 text-slate-500",
											)}
										>
											{mappedStatus === "ready" && (
												<CheckCircle2 className="h-4 w-4" />
											)}
											{mappedStatus === "building" && (
												<Loader2 className="h-4 w-4 animate-spin" />
											)}
											{mappedStatus === "failed" && (
												<AlertCircle className="h-4 w-4" />
											)}
											{mappedStatus === "superseded" && (
												<StopCircle className="h-4 w-4" />
											)}
										</div>
										<div className="flex flex-col gap-1">
											<div className="flex items-center gap-2">
												<span className="font-medium text-sm">
													Deployment #{deploy.id.slice(0, 8)}
												</span>
												<Badge
													className={cn(
														"h-5 px-1.5 text-[10px] uppercase",
														mappedStatus === "ready" &&
															"bg-green-500/10 text-green-500 hover:bg-green-500/20",
														mappedStatus === "building" &&
															"bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
														mappedStatus === "failed" &&
															"bg-red-500/10 text-red-500 hover:bg-red-500/20",
														mappedStatus === "superseded" &&
															"bg-slate-500/10 text-slate-500 hover:bg-slate-500/20",
													)}
													variant="secondary"
												>
													{deploy.status}
												</Badge>
											</div>
											<div className="flex items-center gap-1 text-muted-foreground text-xs">
												<span className="font-mono">
													{deploy.commitHash ?? ""}
												</span>
												{deploy.commitMessage && (
													<>
														<span>•</span>
														<span>{deploy.commitMessage}</span>
													</>
												)}
												<span>•</span>
												<span>
													{formatDuration(deploy.startedAt, deploy.endedAt)}
												</span>
												<span>•</span>
												<span>{formatDate(deploy.startedAt)}</span>
											</div>
										</div>
									</div>
									<div className="flex items-center gap-3">
										<div className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/30 px-2 py-1 text-muted-foreground text-xs">
											{deploy.trigger ?? "manual"}
										</div>
										<ChevronDown
											className={cn(
												"h-4 w-4 text-muted-foreground transition-transform duration-200",
												isExpanded && "rotate-180",
											)}
										/>
									</div>
								</button>

								{isExpanded && <BuildLogsPanel deploymentId={deploy.id} />}
							</div>
						);
					})}
				</div>
			</GlassCard>
		</div>
	);
}
