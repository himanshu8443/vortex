import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CommandToggle } from "./command-toggle";

interface BuildStepProps {
	overrideInstallCommand: boolean;
	installCommand: string;
	onOverrideInstallCommandChange: (v: boolean) => void;
	onInstallCommandChange: (v: string) => void;
	overrideBuildCommand: boolean;
	buildCommand: string;
	onOverrideBuildCommandChange: (v: boolean) => void;
	onBuildCommandChange: (v: string) => void;
	overrideStartCommand: boolean;
	startCommand: string;
	onOverrideStartCommandChange: (v: boolean) => void;
	onStartCommandChange: (v: string) => void;
	rootPath: string;
	onRootPathChange: (v: string) => void;
}

export function BuildStep({
	overrideInstallCommand,
	installCommand,
	onOverrideInstallCommandChange,
	onInstallCommandChange,
	overrideBuildCommand,
	buildCommand,
	onOverrideBuildCommandChange,
	onBuildCommandChange,
	overrideStartCommand,
	startCommand,
	onOverrideStartCommandChange,
	onStartCommandChange,
	rootPath,
	onRootPathChange,
}: BuildStepProps) {
	return (
		<div className="space-y-3">
			<CommandToggle
				enabled={overrideInstallCommand}
				label="Override Install Command"
				onToggle={onOverrideInstallCommandChange}
				onValueChange={onInstallCommandChange}
				placeholder="npm install"
				value={installCommand}
			/>
			<CommandToggle
				enabled={overrideBuildCommand}
				label="Override Build Command"
				onToggle={onOverrideBuildCommandChange}
				onValueChange={onBuildCommandChange}
				placeholder="npm run build"
				value={buildCommand}
			/>
			<CommandToggle
				enabled={overrideStartCommand}
				label="Override Start Command"
				onToggle={onOverrideStartCommandChange}
				onValueChange={onStartCommandChange}
				placeholder="npm start"
				value={startCommand}
			/>

			<div className="space-y-2">
				<Label>Root Path in Repository</Label>
				<Input
					className="bg-muted/20"
					onChange={(e) => onRootPathChange(e.target.value)}
					placeholder="/"
					value={rootPath}
				/>
			</div>
		</div>
	);
}
