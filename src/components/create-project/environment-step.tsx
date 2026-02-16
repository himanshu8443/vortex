import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EnvVarEntry } from "./types";

interface EnvironmentStepProps {
	envVars: EnvVarEntry[];
	onAddVar: () => void;
	onRemoveVar: (index: number) => void;
	onUpdateVar: (index: number, field: "key" | "value", value: string) => void;
}

export function EnvironmentStep({
	envVars,
	onAddVar,
	onRemoveVar,
	onUpdateVar,
}: EnvironmentStepProps) {
	return (
		<div className="space-y-2.5">
			{envVars.map((entry, index) => (
				<div
					className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"
					key={entry.id}
				>
					<Input
						onChange={(e) => onUpdateVar(index, "key", e.target.value)}
						placeholder="KEY"
						value={entry.key}
					/>
					<Input
						onChange={(e) => onUpdateVar(index, "value", e.target.value)}
						placeholder="VALUE"
						value={entry.value}
					/>
					<Button
						disabled={envVars.length === 1}
						onClick={() => onRemoveVar(index)}
						type="button"
						variant="outline"
					>
						Remove
					</Button>
				</div>
			))}
			<Button onClick={onAddVar} type="button" variant="secondary">
				Add Variable
			</Button>
		</div>
	);
}
