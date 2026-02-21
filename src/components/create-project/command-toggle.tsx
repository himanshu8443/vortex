import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface CommandToggleProps {
	enabled: boolean;
	label: string;
	onToggle: (v: boolean) => void;
	value: string;
	onValueChange: (v: string) => void;
	placeholder: string;
}

export function CommandToggle({
	enabled,
	label,
	onToggle,
	value,
	onValueChange,
	placeholder,
}: CommandToggleProps) {
	return (
		<div className="space-y-3 rounded-lg border border-border/60 bg-card/20 p-4 shadow-sm">
			<div className="flex items-center justify-between">
				<Label className="font-medium text-sm">{label}</Label>
				<Switch checked={enabled} onCheckedChange={onToggle} />
			</div>
			{enabled && (
				<Input
					className="fade-in zoom-in-95 animate-in bg-muted/20 duration-200"
					onChange={(e) => onValueChange(e.target.value)}
					placeholder={placeholder}
					value={value}
				/>
			)}
		</div>
	);
}
