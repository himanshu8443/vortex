"use client";

import { Terminal } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { api } from "@/trpc/react";

interface LogsTabProps {
	projectId: string;
	latestDeploymentId?: string | null;
	status: string | null;
}

const MAX_LINES = 1000;

function appendChunk(prev: string[], chunk: string) {
	const incoming = chunk.split(/\r?\n/);
	const merged = [...prev, ...incoming];
	return merged.slice(-MAX_LINES);
}

export function LogsTab({
	projectId,
	latestDeploymentId,
	status,
}: LogsTabProps) {
	const [lines, setLines] = React.useState<string[]>([]);
	const [runtimeFailed, setRuntimeFailed] = React.useState(false);
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
	const bottomRef = React.useRef<HTMLDivElement | null>(null);

	// Project is "building" if its status is anything other than RUNNING
	// (IDLE, STARTING, DEPLOYING, FAILED — none of these have a live container)
	const isBuilding = status !== "RUNNING";

	React.useEffect(() => {
		if (!projectId) return;
		setLines([]);
		setRuntimeFailed(false);
		setErrorMessage(null);
	}, [projectId]);

	// When building / not running, skip container logs entirely (container may not exist).
	// When RUNNING, try container logs first; fall back to deployment logs on error.
	const shouldFetchContainerLogs = !!projectId && !isBuilding && !runtimeFailed;
	const shouldFetchDeploymentLogs =
		(isBuilding || runtimeFailed) && !!latestDeploymentId;

	// Track which source is active so we can clear on switch
	const activeSource = shouldFetchContainerLogs ? "container" : "deployment";
	const prevSourceRef = React.useRef(activeSource);

	React.useEffect(() => {
		if (prevSourceRef.current !== activeSource) {
			setLines([]);
			setErrorMessage(null);
			prevSourceRef.current = activeSource;
		}
	}, [activeSource]);

	api.logs.streamProjectLogs.useSubscription(
		{ projectId },
		{
			enabled: shouldFetchContainerLogs,
			onData: (chunk) => {
				setLines((prev) => appendChunk(prev, chunk));
				queueMicrotask(() => {
					bottomRef.current?.scrollIntoView({ behavior: "auto" });
				});
			},
			onError: (error) => {
				setRuntimeFailed(true);
				setErrorMessage(error.message);
			},
		},
	);

	api.logs.streamDeploymentLogs.useSubscription(
		{ deploymentId: latestDeploymentId ?? "" },
		{
			enabled: shouldFetchDeploymentLogs,
			onData: (chunk) => {
				setLines((prev) => appendChunk(prev, chunk));
				queueMicrotask(() => {
					bottomRef.current?.scrollIntoView({ behavior: "auto" });
				});
			},
			onError: (error) => {
				setErrorMessage(error.message);
			},
		},
	);

	const title = isBuilding || runtimeFailed ? "Build Logs" : "Runtime Logs";

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-semibold text-lg">Logs</h2>
			</div>

			<GlassCard className="overflow-hidden border border-border/60 p-0">
				<div className="flex items-center justify-between border-border/60 border-b bg-muted/20 px-3 py-2">
					<div className="flex items-center gap-2 font-medium text-sm">
						<Terminal className="h-4 w-4" />
						{title}
					</div>
					<Button
						onClick={() => setLines([])}
						size="sm"
						type="button"
						variant="outline"
					>
						Clear
					</Button>
				</div>

				<div className="h-[52vh] overflow-y-auto bg-black px-3 py-2 font-mono text-green-400 text-xs leading-5">
					{lines.length === 0 ? (
						<div className="text-muted-foreground">Waiting for logs...</div>
					) : (
						lines.map((line, index) => (
							<div className="whitespace-pre-wrap" key={`${index}-${line}`}>
								{line}
							</div>
						))
					)}
					<div ref={bottomRef} />
				</div>
			</GlassCard>

			{errorMessage && (
				<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-destructive text-sm">
					{errorMessage}
				</div>
			)}
		</div>
	);
}
