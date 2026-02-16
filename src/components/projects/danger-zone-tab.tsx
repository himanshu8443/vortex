"use client";

import { Button } from "@/components/ui/button";

interface DangerZoneTabProps {
	onDelete: () => void;
	isDeleting?: boolean;
}

export function DangerZoneTab({
	onDelete,
	isDeleting = false,
}: DangerZoneTabProps) {
	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-semibold text-lg text-red-500">Danger Zone</h2>
				<p className="text-muted-foreground text-sm">
					Irreversible actions for this service.
				</p>
			</div>

			<div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 backdrop-blur-sm">
				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<h3 className="font-medium text-foreground">Delete Service</h3>
						<p className="text-muted-foreground text-sm">
							Permanently remove this service and all of its data.
						</p>
					</div>
					<Button
						disabled={isDeleting}
						onClick={onDelete}
						variant="destructive"
					>
						{isDeleting ? "Deleting..." : "Delete Service"}
					</Button>
				</div>
			</div>
		</div>
	);
}
