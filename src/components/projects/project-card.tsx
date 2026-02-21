"use client";

import { Box, Clock, GitBranch, Globe, Server } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { GlassCard } from "@/components/ui/glass-card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface Project {
	id: string;
	name: string;
	domain: string;
	repo: string;
	branch: string;
	status: "online" | "building" | "offline";
	cpu: number;
	memoryUsed: number;
	memoryLimit: number;
	memoryPercent: number;
	updatedAt: string;
	type: "frontend" | "backend" | "service";
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const units = ["B", "KB", "MB", "GB"];
	const k = 1024;
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const val = bytes / k ** i;
	return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`;
}

function shortenRepo(repo: string): string {
	if (!repo || repo === "manual") return repo;
	const match = repo.match(/github\.com[/:]([^/]+\/[^/.]+)(?:\.git)?$/i);
	return match?.[1] ?? repo;
}

export function ProjectCard({ project }: { project: Project }) {
	const getStatusColor = (status: Project["status"]) => {
		switch (status) {
			case "online":
				return "bg-green-500";
			case "building":
				return "bg-yellow-500 animate-pulse";
			case "offline":
				return "bg-red-500";
			default:
				return "bg-gray-500";
		}
	};

	const getIcon = (type: Project["type"]) => {
		switch (type) {
			case "frontend":
				return <Globe className="h-5 w-5 text-indigo-500" />;
			case "backend":
				return <Box className="h-5 w-5 text-blue-500" />;
			case "service":
				return <Server className="h-5 w-5 text-purple-500" />;
		}
	};

	const shortRepo = shortenRepo(project.repo);

	return (
		<GlassCard className="border transition-all duration-200 hover:border-primary/30">
			<CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
				<div className="flex items-center space-x-3">
					<div className="rounded-xl bg-secondary/50 p-2 ring-1 ring-border/50 backdrop-blur-sm">
						{getIcon(project.type)}
					</div>
					<div className="min-w-0">
						<CardTitle className="font-medium text-lg">
							{project.name}
						</CardTitle>
					</div>
				</div>
				<div
					className={cn(
						"h-2.5 w-2.5 shrink-0 rounded-full",
						getStatusColor(project.status),
					)}
					title={
						project.status.charAt(0).toUpperCase() + project.status.slice(1)
					}
				/>
			</CardHeader>
			<CardContent className="space-y-4 pt-4">
				<div className="flex items-center justify-between text-sm">
					<div className="flex min-w-0 items-center text-muted-foreground">
						<GitBranch className="mr-1 h-3.5 w-3.5 shrink-0" />
						<span className="truncate font-mono text-xs">{shortRepo}</span>
					</div>
					{project.branch && (
						<Badge
							className="ml-2 shrink-0 font-mono text-xs"
							variant="secondary"
						>
							{project.branch}
						</Badge>
					)}
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-1">
						<div className="flex items-center justify-between text-xs">
							<span className="text-muted-foreground">CPU</span>
							<span className="font-medium font-mono text-foreground">
								{project.cpu}%
							</span>
						</div>
						<Progress className="h-1.5" value={project.cpu} />
					</div>
					<div className="space-y-1">
						<div className="flex items-center justify-between text-xs">
							<span className="text-muted-foreground">Memory</span>
							<span className="font-medium font-mono text-foreground">
								{formatBytes(project.memoryUsed)}
							</span>
						</div>
						<Progress className="h-1.5" value={project.memoryPercent} />
					</div>
				</div>
			</CardContent>
			<CardFooter className="pt-2 text-muted-foreground text-xs">
				<Clock className="mr-1 h-3.5 w-3.5" />
				Updated {project.updatedAt}
			</CardFooter>
		</GlassCard>
	);
}
