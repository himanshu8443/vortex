import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CommandToggle } from "./command-toggle";
import { useProjectForm } from "./types";

export function BuildStep() {
	const { formData, updateForm } = useProjectForm();
	const {
		overrideInstallCommand,
		installCommand,
		overrideBuildCommand,
		buildCommand,
		overrideStartCommand,
		startCommand,
		rootPath,
	} = formData;

	return (
		<div className="space-y-4">
			<CommandToggle
				enabled={overrideInstallCommand}
				label="Override Install Command"
				onToggle={(v) => updateForm({ overrideInstallCommand: v })}
				onValueChange={(v) => updateForm({ installCommand: v })}
				placeholder="npm install"
				value={installCommand}
			/>
			<CommandToggle
				enabled={overrideBuildCommand}
				label="Override Build Command"
				onToggle={(v) => updateForm({ overrideBuildCommand: v })}
				onValueChange={(v) => updateForm({ buildCommand: v })}
				placeholder="npm run build"
				value={buildCommand}
			/>
			<CommandToggle
				enabled={overrideStartCommand}
				label="Override Start Command"
				onToggle={(v) => updateForm({ overrideStartCommand: v })}
				onValueChange={(v) => updateForm({ startCommand: v })}
				placeholder="npm start"
				value={startCommand}
			/>

			<div className="space-y-2 rounded-lg border border-border/60 bg-card/20 p-4 shadow-sm">
				<Label className="font-medium text-sm">Root Path in Repository</Label>
				<Input
					className="bg-muted/20"
					onChange={(e) => updateForm({ rootPath: e.target.value })}
					placeholder="/"
					value={rootPath}
				/>
				<p className="text-muted-foreground text-xs">
					The directory where your application code resides.
				</p>
			</div>
		</div>
	);
}
