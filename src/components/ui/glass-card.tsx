"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const glassCardVariants = cva(
	"group relative flex flex-col gap-6 overflow-hidden bg-card/20 p-6 shadow-md backdrop-blur-md transition-all hover:shadow-xl",
	{
		variants: {
			variant: {
				default: "border-border hover:border-primary/30 hover:shadow-primary/1",
				active: "border-primary/50 shadow-primary/10",
				destructive:
					"border-destructive/50 hover:border-destructive hover:shadow-destructive/5",
			},
			size: {
				default: "rounded-xl",
				sm: "rounded-lg",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export interface GlassCardProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof glassCardVariants> {
	asChild?: boolean;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
	({ className, variant, size, children, ...props }, ref) => {
		return (
			<div
				className={cn(glassCardVariants({ variant, size, className }))}
				ref={ref}
				{...props}
			>
				<div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/2 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
				{children}
			</div>
		);
	},
);
GlassCard.displayName = "GlassCard";

export { GlassCard, glassCardVariants };
