"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface DangerZoneTabProps {
	onDelete: () => void;
	isDeleting?: boolean;
	projectName?: string;
}

export function DangerZoneTab({
	onDelete,
	isDeleting = false,
	projectName = "",
}: DangerZoneTabProps) {
	const [confirmOpen, setConfirmOpen] = useState(false);

	const handleConfirmDelete = () => {
		onDelete();
		setConfirmOpen(false);
	};

	return (
		<>
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
							onClick={() => setConfirmOpen(true)}
							variant="destructive"
						>
							{isDeleting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Deleting...
								</>
							) : (
								"Delete Service"
							)}
						</Button>
					</div>
				</div>
			</div>

			<Dialog onOpenChange={setConfirmOpen} open={confirmOpen}>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-destructive">
							<AlertTriangle className="h-5 w-5" />
							Delete Project
						</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete{" "}
							{projectName ? (
								<strong className="text-foreground">{projectName}</strong>
							) : (
								"this project"
							)}
							? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>

					<DialogFooter className="gap-2 space-x-4 pt-2 sm:gap-0">
						<Button
							onClick={() => setConfirmOpen(false)}
							type="button"
							variant="outline"
						>
							Cancel
						</Button>
						<Button
							disabled={isDeleting}
							onClick={handleConfirmDelete}
							type="button"
							variant="destructive"
						>
							{isDeleting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Deleting...
								</>
							) : (
								"Delete"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
