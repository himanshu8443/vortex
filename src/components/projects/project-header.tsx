"use client";

import { ArrowLeft, GitBranch, Globe } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ProjectHeaderProps {
	projectName: string;
	gitRepo: string;
	branch: string;
	status: "online" | "building" | "offline";
	lastUpdated: string;
	domain: string;
	onRedeploy: () => void;
	onRestart: () => void;
	isRedeploying?: boolean;
	isRestarting?: boolean;
}

const getStatusColor = (status: ProjectHeaderProps["status"]) => {
	switch (status) {
		case "online":
			return "bg-green-500/15 text-green-500 hover:bg-green-500/25 border-green-500/20";
		case "building":
			return "bg-yellow-500/15 text-yellow-500 hover:bg-yellow-500/25 border-yellow-500/20";
		case "offline":
			return "bg-red-500/15 text-red-500 hover:bg-red-500/25 border-red-500/20";
		default:
			return "bg-gray-500/15 text-gray-500 hover:bg-gray-500/25 border-gray-500/20";
	}
};
export function ProjectHeader({
	projectName,
	gitRepo,
	branch,
	status,
	lastUpdated,
	domain,
	onRedeploy,
	onRestart,
	isRedeploying = false,
	isRestarting = false,
}: ProjectHeaderProps) {
	const router = useRouter();
	const _pathname = usePathname();

	return (
		<div className="flex flex-col gap-6 border-b bg-background/50 px-6 py-6 backdrop-blur-xl">
			<div className="flex items-center gap-2 text-muted-foreground text-sm">
				<Button
					className="-ml-2 h-auto p-1 px-2 text-muted-foreground hover:text-foreground"
					onClick={() => router.push("/")}
					size="sm"
					variant="ghost"
				>
					<ArrowLeft className="mr-1 h-3.5 w-3.5" />
					Back
				</Button>
				<span className="opacity-50">/</span>
				<span className="font-medium text-foreground">{projectName}</span>
			</div>

			<div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
				<div className="flex items-center gap-4">
					<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary/60 text-primary-foreground shadow-lg shadow-primary/20">
						<Globe className="h-6 w-6" />
					</div>
					<div className="flex flex-col gap-1">
						<h1 className="font-bold text-2xl tracking-tight">{projectName}</h1>
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<a
								className="transition-colors hover:text-primary hover:underline"
								href={`http://${domain}`}
								rel="noreferrer"
								target="_blank"
							>
								{domain}
							</a>
							<span className="h-1 w-1 rounded-full bg-border" />
							<div className="flex items-center gap-1">
								<GitBranch className="h-3 w-3" />
								<span className="font-mono text-xs">{gitRepo}</span>
							</div>
							<span className="h-1 w-1 rounded-full bg-border" />
							<span className="font-mono text-xs">{branch}</span>
							<span className="h-1 w-1 rounded-full bg-border" />
							<span className="text-xs">Updated {lastUpdated}</span>
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Badge
						className={cn("px-3 py-1 capitalize", getStatusColor(status))}
						variant="outline"
					>
						<span className="mr-1.5 inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-current opacity-80" />
						{status}
					</Badge>
					<div className="hidden h-8 w-px bg-border md:block" />
					<Button
						disabled={isRestarting || isRedeploying}
						onClick={onRestart}
						size="sm"
						variant="outline"
					>
						{isRestarting ? "Restarting..." : "Restart"}
					</Button>
					<Button
						disabled={isRedeploying || isRestarting}
						onClick={onRedeploy}
						size="sm"
						variant="outline"
					>
						{isRedeploying ? "Redeploying..." : "Redeploy"}
					</Button>
					<Button
						className="hidden border-border/50 md:flex"
						onClick={() => window.open(`http://${domain}`, "_blank")}
						size="sm"
						variant="outline"
					>
						Visit App
					</Button>
				</div>
			</div>
		</div>
	);
}

function cn(...classes: (string | undefined | null | false)[]) {
	return classes.filter(Boolean).join(" ");
}
