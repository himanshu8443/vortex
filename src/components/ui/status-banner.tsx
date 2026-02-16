"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, Loader2 } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const statusBannerVariants = cva(
	"slide-in-from-bottom-5 fade-in-0 fixed bottom-6 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 animate-in items-center justify-between gap-4 rounded-xl border p-4 shadow-lg backdrop-blur-md transition-all duration-300",
	{
		variants: {
			variant: {
				default: "border-border/50 bg-background/80 text-foreground",
				warning: "border-yellow-500/50 bg-yellow-950/80 text-yellow-200",
				destructive:
					"border-destructive/50 bg-destructive/80 text-destructive-foreground",
				success: "border-green-500/50 bg-green-950/80 text-green-200",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

export interface StatusBannerProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof statusBannerVariants> {
	open?: boolean;
	loading?: boolean;
	description?: string;
	actionLabel?: string;
	cancelLabel?: string;
	onAction?: () => void;
	onCancel?: () => void;
}

export function StatusBanner({
	className,
	variant,
	open = false,
	loading = false,
	description = "You have unsaved changes.",
	actionLabel = "Save Changes",
	cancelLabel = "Discard",
	onAction,
	onCancel,
	children,
	...props
}: StatusBannerProps) {
	if (!open) return null;

	return (
		<div
			className={cn(statusBannerVariants({ variant }), className)}
			{...props}
		>
			<div className="flex items-center gap-3">
				<div className="rounded-lg bg-background/20 p-2 text-inherit backdrop-blur-sm">
					{loading ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<AlertTriangle className="h-4 w-4" />
					)}
				</div>
				<div className="flex flex-col gap-0.5">
					<span className="font-semibold text-sm">Unsaved Changes</span>
					<span className="text-xs opacity-90">{description}</span>
				</div>
			</div>
			<div className="flex items-center gap-2">
				{onCancel && (
					<Button
						className="h-8 px-3 text-xs hover:bg-background/20 hover:text-inherit"
						disabled={loading}
						onClick={onCancel}
						size="sm"
						variant="ghost"
					>
						{cancelLabel}
					</Button>
				)}
				{onAction && (
					<Button
						className="h-8 border-0 bg-background px-3 text-foreground text-xs shadow-none hover:bg-background/90"
						disabled={loading}
						onClick={onAction}
						size="sm"
					>
						{actionLabel}
					</Button>
				)}
			</div>
		</div>
	);
}
