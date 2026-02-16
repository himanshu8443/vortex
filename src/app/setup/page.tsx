"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, User, ArrowRight, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

export default function SetupPage() {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Form State
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");

    const { data: userCount, isLoading: isCheckingUsers } = api.user.userCount.useQuery();

    useEffect(() => {
        if (!isCheckingUsers && typeof userCount === 'number' && userCount > 0) {
            router.push("/login");
        }
    }, [userCount, isCheckingUsers, router]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		try {
			await authClient.signUp.email(
				{
					email,
					password,
					name,
				},
				{
					onSuccess: () => {
						router.push("/");
					},
					onError: (ctx) => {
						setError(ctx.error.message);
						setIsLoading(false);
					},
				},
			);
		} catch (err) {
			console.error("Auth error:", err);
			setError("An unexpected error occurred. Please try again.");
			setIsLoading(false);
		}
	};

    if (isCheckingUsers || (typeof userCount === 'number' && userCount > 0)) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

	return (
		<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background/80 via-background to-muted/20 p-4">
			<div className="w-full max-w-md space-y-8">
				{/* ─── Header ────────────────────────────────────────── */}
				<div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 backdrop-blur-sm shadow-lg shadow-primary/5">
						<ShieldCheck className="h-8 w-8 text-primary" />
					</div>
					<h2 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
						Welcome to Vortex
					</h2>
					<p className="mt-3 text-sm text-muted-foreground max-w-xs mx-auto">
						No users found. Create the initial administrator account to get started.
					</p>
				</div>

				<GlassCard className="border-border/50 shadow-2xl shadow-primary/5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500 delay-100 p-8">
					<form onSubmit={handleSubmit} className="space-y-5">
						<div className="space-y-2">
							<Label htmlFor="name">Full Name</Label>
							<div className="relative group">
								<User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
								<Input
									id="name"
									placeholder="Admin User"
									className="pl-9 bg-muted/30 border-border/50 focus-visible:ring-primary/20 transition-all h-10"
									value={name}
									onChange={(e) => setName(e.target.value)}
									required
									disabled={isLoading}
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<div className="relative group">
								<Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
								<Input
									id="email"
									type="email"
									placeholder="admin@example.com"
									className="pl-9 bg-muted/30 border-border/50 focus-visible:ring-primary/20 transition-all h-10"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									disabled={isLoading}
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<div className="relative group">
								<Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
								<Input
									id="password"
									type="password"
									placeholder="••••••••"
									className="pl-9 bg-muted/30 border-border/50 focus-visible:ring-primary/20 transition-all h-10"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									disabled={isLoading}
									minLength={8}
								/>
							</div>
                            <p className="text-[10px] text-muted-foreground ml-1">Must be at least 8 characters long</p>
						</div>

						{/* ─── Error Message ───────────────────────────── */}
						{error && (
							<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-2 border border-destructive/20">
								<p className="font-medium flex items-center gap-2">
                                    Setup Failed
                                </p>
								<p className="text-xs opacity-90 mt-1">{error}</p>
							</div>
						)}

						{/* ─── Submit Button ───────────────────────────── */}
						<Button
							type="submit"
							className="w-full relative overflow-hidden group/btn h-11 text-base font-medium shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all"
							disabled={isLoading}
                            size="lg"
						>
							<span className={cn("flex items-center gap-2 transition-all", isLoading ? "opacity-0" : "opacity-100 group-hover/btn:translate-x-1")}>
								Create Admin Account
								{!isLoading && <ArrowRight className="h-4 w-4" />}
							</span>
							{isLoading && (
								<div className="absolute inset-0 flex items-center justify-center">
									<Loader2 className="h-5 w-5 animate-spin" />
								</div>
							)}
						</Button>
					</form>
				</GlassCard>
			</div>
		</div>
	);
}
