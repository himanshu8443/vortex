import { useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	getAvailableCpuOptions,
	getAvailableMemoryOptions,
} from "@/lib/resource-options";
import { api } from "@/trpc/react";
import {
	createRuntimePortEntry,
	type RuntimePortEntry,
	useProjectForm,
} from "./types";

export function RuntimeStep() {
	const { formData, updateForm } = useProjectForm();
	const { runtimePorts, cpuLimit, memoryLimit } = formData;

	const runtimePortIdRef = useRef(Date.now());
	const nextRuntimePortId = () => `runtime-port-${runtimePortIdRef.current++}`;

	// Fetch host resources to propose proper cpu/ram options
	const { data: hostResources } = api.project.getHostResources.useQuery(
		undefined,
		{ staleTime: 60_000 },
	);

	const cpuOptions = useMemo(
		() => getAvailableCpuOptions(hostResources?.cpuCount ?? 1),
		[hostResources?.cpuCount],
	);
	const memoryOptions = useMemo(
		() =>
			getAvailableMemoryOptions(
				hostResources?.totalMemoryBytes ?? 512 * 1024 * 1024,
			),
		[hostResources?.totalMemoryBytes],
	);

	const addPort = () => {
		updateForm({
			runtimePorts: [
				...runtimePorts,
				createRuntimePortEntry(nextRuntimePortId()),
			],
		});
	};

	const removePort = (index: number) => {
		updateForm({ runtimePorts: runtimePorts.filter((_, i) => i !== index) });
	};

	const updatePort = (
		index: number,
		field: "port" | "domain" | "exposedPort",
		value: string,
	) => {
		const newPorts = [...runtimePorts];
		newPorts[index] = {
			...newPorts[index],
			[field]: value,
		} as RuntimePortEntry;
		updateForm({ runtimePorts: newPorts });
	};

	return (
		<div className="space-y-6">
			{/* Ports */}
			<div className="space-y-4 rounded-lg border border-border/60 bg-card/20 p-4 shadow-sm">
				<div className="flex items-center justify-between">
					<Label className="font-medium">Ports & Domains</Label>
					<Button onClick={addPort} size="sm" type="button" variant="secondary">
						Add Port
					</Button>
				</div>
				<div className="space-y-2 text-muted-foreground text-xs">
					<div className="grid gap-2 md:grid-cols-[120px_1fr_130px_90px]">
						<div className="font-medium">Container Port</div>
						<div className="font-medium">Domain</div>
						<div className="font-medium">Exposed Port</div>
						<div className="w-[90px]"></div>
					</div>
				</div>
				<div className="space-y-3">
					{runtimePorts.map((entry, index) => (
						<div
							className="fade-in zoom-in-95 grid animate-in gap-2 duration-200 md:grid-cols-[120px_1fr_130px_90px]"
							key={entry.id}
						>
							<Input
								className="bg-muted/20"
								onChange={(e) => updatePort(index, "port", e.target.value)}
								placeholder="3000"
								value={entry.port}
							/>
							<Input
								className="bg-muted/20"
								onChange={(e) => updatePort(index, "domain", e.target.value)}
								placeholder="https://app.example.com (Optional)"
								value={entry.domain}
							/>
							<Input
								className="bg-muted/20"
								onChange={(e) =>
									updatePort(index, "exposedPort", e.target.value)
								}
								placeholder="Optional"
								value={entry.exposedPort}
							/>
							<Button
								className="hover:bg-destructive/10 hover:text-destructive"
								onClick={() => removePort(index)}
								type="button"
								variant="outline"
							>
								Remove
							</Button>
						</div>
					))}
				</div>
			</div>

			{/* Resource Limits */}
			<div className="space-y-4 rounded-lg border border-border/60 bg-card/20 p-4 shadow-sm">
				<Label className="font-medium">Resource Limits</Label>
				<div className="grid gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<Label className="text-muted-foreground text-xs">CPU Limit</Label>
						<Select
							onValueChange={(v) => updateForm({ cpuLimit: v })}
							value={cpuLimit}
						>
							<SelectTrigger className="w-full bg-muted/20 font-mono text-sm">
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
					<div className="space-y-2">
						<Label className="text-muted-foreground text-xs">
							Memory Limit
						</Label>
						<Select
							onValueChange={(v) => updateForm({ memoryLimit: v })}
							value={memoryLimit}
						>
							<SelectTrigger className="w-full bg-muted/20 font-mono text-sm">
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
			</div>
		</div>
	);
}
