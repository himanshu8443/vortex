"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { CreateProjectDialog } from "@/components/create-project";
import type { Project } from "@/components/projects/project-card";
import { ProjectCard } from "@/components/projects/project-card";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";

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

function mapProjectStatus(status: string | null): Project["status"] {
	if (status === "RUNNING") return "online";
	if (
		status === "BUILDING" ||
		status === "DEPLOYING" ||
		status === "STARTING"
	) {
		return "building";
	}
	return "offline";
}

export default function Page() {
	const {
		data: dbProjects = [],
		isLoading,
		error,
		refetch,
	} = api.project.getAllProjects.useQuery(undefined, {
		retry: false,
	});

	// Poll live metrics every 5 seconds
	const { data: metricsData } = api.project.getAllMetrics.useQuery(undefined, {
		refetchInterval: 5_000,
		enabled: dbProjects.length > 0,
	});

	// Build a quick lookup map: projectId -> metrics
	const metricsMap = React.useMemo(() => {
		const map = new Map<
			string,
			{ cpu: string; memory: number; memoryLimit: number; memoryPercent: string }
		>();
		if (metricsData) {
			for (const entry of metricsData) {
				map.set(entry.projectId, entry.metrics as {
					cpu: string;
					memory: number;
					memoryLimit: number;
					memoryPercent: string;
				});
			}
		}
		return map;
	}, [metricsData]);

	const projects: Project[] = dbProjects.map((project) => {
		const metrics = metricsMap.get(project.id);

		return {
			id: project.id,
			name: project.name,
			domain: project.image ?? "-",
			repo: project.repoUrl ?? project.image ?? "manual",
			branch: project.branch ?? "main",
			status: mapProjectStatus(project.status),
			cpu: metrics ? parseFloat(metrics.cpu) : 0,
			memoryUsed: metrics?.memory ?? 0,
			memoryLimit: metrics?.memoryLimit ?? 0,
			memoryPercent: metrics ? parseFloat(metrics.memoryPercent) : 0,
			updatedAt: getUpdatedAtLabel(
				project.updatedAt ?? project.createdAt ?? null,
			),
			type: project.sourceType === "GIT" ? "frontend" : "service",
		};
	});

	return (
		<div className="min-h-screen pb-10">
			<main className="container mx-auto mt-10 max-w-6xl px-4 md:px-6">
				<div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="space-y-1">
						<h1 className="font-bold text-3xl tracking-tight">Projects</h1>
						<p className="text-muted-foreground">
							Manage and monitor your deployed applications.
						</p>
					</div>
					<CreateProjectDialog>
						<Button className="shadow-lg transition-all hover:shadow-xl">
							<Plus className="mr-2 h-4 w-4" /> New Project
						</Button>
					</CreateProjectDialog>
				</div>

				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{isLoading && (
						<div className="rounded-xl border border-border bg-card/40 p-4 text-muted-foreground text-sm sm:col-span-2 lg:col-span-3">
							Loading projects...
						</div>
					)}

					{error && (
						<div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive text-sm sm:col-span-2 lg:col-span-3">
							<span>
								Failed to load projects. Please check your database migration
								and try again.
							</span>
							<Button
								onClick={() => void refetch()}
								size="sm"
								variant="outline"
							>
								Retry
							</Button>
						</div>
					)}

					{!isLoading && !error && projects.length === 0 && (
						<div className="rounded-xl border border-border bg-card/40 p-4 text-muted-foreground text-sm sm:col-span-2 lg:col-span-3">
							No projects yet. Create your first project to get started.
						</div>
					)}

					{projects.map((project) => (
						<Link
							className="block h-full"
							href={`/projects/${project.id}`}
							key={project.id}
						>
							<ProjectCard project={project} />
						</Link>
					))}

					<CreateProjectDialog>
						<button
							className="flex h-full min-h-55 w-full flex-col items-center justify-center rounded-xl border border-border border-dashed bg-card/20 text-muted-foreground shadow-md backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-card/40 hover:text-accent-foreground hover:shadow-xl"
							type="button"
						>
							<div className="mb-4 rounded-full bg-secondary/50 p-4 shadow-sm ring-1 ring-border/50 backdrop-blur-sm">
								<Plus className="h-6 w-6" />
							</div>
							<span className="font-semibold">Create New Project</span>
							<span className="mt-1 text-muted-foreground text-xs">
								Deploy a new app
							</span>
						</button>
					</CreateProjectDialog>
				</div>
			</main>
		</div>
	);
}
