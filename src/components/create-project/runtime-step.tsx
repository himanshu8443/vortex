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
import type { RuntimePortEntry } from "./types";

interface RuntimeStepProps {
	runtimePorts: RuntimePortEntry[];
	onAddPort: () => void;
	onRemovePort: (index: number) => void;
	onUpdatePort: (
		index: number,
		field: "port" | "domain" | "exposedPort",
		value: string,
	) => void;
	cpuLimit: string;
	onCpuLimitChange: (v: string) => void;
	memoryLimit: string;
	onMemoryLimitChange: (v: string) => void;
	cpuOptions: { value: string; label: string }[];
	memoryOptions: { value: string; label: string }[];
}

export function RuntimeStep({
	runtimePorts,
	onAddPort,
	onRemovePort,
	onUpdatePort,
	cpuLimit,
	onCpuLimitChange,
	memoryLimit,
	onMemoryLimitChange,
	cpuOptions,
	memoryOptions,
}: RuntimeStepProps) {
	return (
		<div className="space-y-4">
			{/* Ports */}
			<div className="space-y-3">
				<Label>Ports & Domains</Label>
				<div className="space-y-2 text-muted-foreground text-xs">
					<div className="grid gap-2 md:grid-cols-[120px_1fr_120px_auto]">
						<div className="font-medium">Container Port</div>
						<div className="font-medium">Domain</div>
						<div className="font-medium">Exposed Port</div>
						<div></div>
					</div>
				</div>
				{runtimePorts.map((entry, index) => (
					<div
						className="grid gap-2 md:grid-cols-[120px_1fr_120px_auto]"
						key={entry.id}
					>
						<Input
							onChange={(e) => onUpdatePort(index, "port", e.target.value)}
							placeholder="8080"
							value={entry.port}
						/>
						<Input
							onChange={(e) => onUpdatePort(index, "domain", e.target.value)}
							placeholder="Optional domain"
							value={entry.domain}
						/>
						<Input
							onChange={(e) =>
								onUpdatePort(index, "exposedPort", e.target.value)
							}
							placeholder="Optional port to expose on host"
							value={entry.exposedPort}
						/>
						<Button
							disabled={runtimePorts.length === 1}
							onClick={() => onRemovePort(index)}
							type="button"
							variant="outline"
						>
							Remove
						</Button>
					</div>
				))}
				<Button onClick={onAddPort} type="button" variant="secondary">
					Add Port
				</Button>
			</div>

			{/* Resource Limits */}
			<div className="space-y-3">
				<Label>Resource Limits</Label>
				<div className="grid gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<Label className="text-muted-foreground text-xs">CPU Limit</Label>
						<Select onValueChange={onCpuLimitChange} value={cpuLimit}>
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
					<div className="space-y-2">
						<Label className="text-muted-foreground text-xs">
							Memory Limit
						</Label>
						<Select onValueChange={onMemoryLimitChange} value={memoryLimit}>
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
			</div>
		</div>
	);
}
