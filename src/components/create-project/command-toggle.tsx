import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface CommandToggleProps {
	label: string;
	placeholder: string;
	enabled: boolean;
	value: string;
	onToggle: (checked: boolean) => void;
	onValueChange: (val: string) => void;
}

export function CommandToggle({
	label,
	placeholder,
	enabled,
	value,
	onToggle,
	onValueChange,
}: CommandToggleProps) {
	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
				<div className="font-medium text-sm">{label}</div>
				<Switch checked={enabled} onCheckedChange={onToggle} />
			</div>
			{enabled && (
				<Input
					className="font-mono text-sm"
					onChange={(e) => onValueChange(e.target.value)}
					placeholder={placeholder}
					value={value}
				/>
			)}
		</div>
	);
}
