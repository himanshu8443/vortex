"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";

interface EnvTabProps {
	variables: { key: string; value: string }[];
	onInputChange: () => void;
}

export function EnvTab({ variables, onInputChange }: EnvTabProps) {
	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-semibold text-lg">Variables</h2>
				<p className="text-muted-foreground text-sm">Secrets & configs.</p>
			</div>

			<GlassCard>
				<div className="space-y-4">
					<div className="grid grid-cols-12 gap-4 px-1 font-medium text-muted-foreground text-xs">
						<div className="col-span-4">KEY</div>
						<div className="col-span-7">VALUE</div>
						<div className="col-span-1 text-right">ACTION</div>
					</div>

					<div className="space-y-3">
						{variables.map((variable, index) => (
							<div
								className="fade-in slide-in-from-left-2 grid animate-in grid-cols-12 items-center gap-4 duration-300"
								key={`${variable.key}-${index}`}
								style={{ animationDelay: `${index * 50}ms` }}
							>
								<div className="col-span-4">
									<Input
										className="h-9 bg-muted/20 font-mono text-xs"
										defaultValue={variable.key}
										onChange={onInputChange}
									/>
								</div>
								<div className="col-span-7">
									<Input
										className="h-9 bg-muted/20 font-mono text-xs"
										defaultValue={variable.value}
										onChange={onInputChange}
										type="password"
									/>
								</div>
								<div className="col-span-1 text-right">
									<Button
										className="h-8 w-8 text-muted-foreground hover:text-destructive"
										onClick={onInputChange}
										size="icon"
										variant="ghost"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</div>
						))}

						<div className="grid grid-cols-12 items-center gap-4 pt-2">
							<div className="col-span-4">
								<Input className="h-9 font-mono text-xs" placeholder="KEY" />
							</div>
							<div className="col-span-8">
								<Input className="h-9 font-mono text-xs" placeholder="VALUE" />
							</div>
						</div>
					</div>

					<Button
						className="mt-4 w-full border-border/60 border-dashed text-muted-foreground hover:border-primary/50 hover:bg-muted/50"
						onClick={onInputChange}
						variant="outline"
					>
						<Plus className="mr-2 h-3.5 w-3.5" />
						Add New Variable
					</Button>
				</div>
			</GlassCard>
		</div>
	);
}
