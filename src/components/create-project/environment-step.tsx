import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEnvVarEntry, type EnvVarEntry, useProjectForm } from "./types";

export function EnvironmentStep() {
	const { formData, updateForm } = useProjectForm();
	const { envVars } = formData;

	const envVarIdRef = useRef(Date.now());
	const nextEnvVarId = () => `env-var-${envVarIdRef.current++}`;

	const addVar = () => {
		updateForm({ envVars: [...envVars, createEnvVarEntry(nextEnvVarId())] });
	};

	const removeVar = (index: number) => {
		updateForm({ envVars: envVars.filter((_, i) => i !== index) });
	};

	const updateVar = (index: number, field: "key" | "value", value: string) => {
		const newVars = [...envVars];
		newVars[index] = { ...newVars[index], [field]: value } as EnvVarEntry;
		updateForm({ envVars: newVars });
	};

	return (
		<div className="space-y-4 rounded-lg border border-border/60 bg-card/20 p-4 shadow-sm">
			<div className="flex items-center justify-between">
				<Label className="font-medium">Environment Variables</Label>
				<Button onClick={addVar} size="sm" type="button" variant="secondary">
					Add Variable
				</Button>
			</div>

			<div className="space-y-3 pt-2">
				{envVars.map((entry, index) => (
					<div
						className="fade-in zoom-in-95 grid animate-in gap-2 duration-200 md:grid-cols-[1fr_1fr_auto]"
						key={entry.id}
					>
						<Input
							className="bg-muted/20 font-mono text-sm"
							onChange={(e) => updateVar(index, "key", e.target.value)}
							placeholder="KEY"
							value={entry.key}
						/>
						<Input
							className="bg-muted/20 font-mono text-sm"
							onChange={(e) => updateVar(index, "value", e.target.value)}
							placeholder="VALUE"
							value={entry.value}
						/>
						<Button
							className="hover:bg-destructive/10 hover:text-destructive"
							disabled={envVars.length === 1}
							onClick={() => removeVar(index)}
							type="button"
							variant="outline"
						>
							Remove
						</Button>
					</div>
				))}
			</div>
		</div>
	);
}
