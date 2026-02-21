"use client";

import { ArrowRight, KeyRound, Loader2, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

export default function AuthPage() {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Form State
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	// Check if any users exist
	const { data: userCount, isLoading: isCheckingUsers } =
		api.user.userCount.useQuery();

	useEffect(() => {
		// If query finished and count is 0, redirect to setup
		if (!isCheckingUsers && typeof userCount === "number" && userCount === 0) {
			console.log(userCount);
			router.push("/setup");
		}
	}, [userCount, isCheckingUsers, router]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		try {
			await authClient.signIn.email(
				{
					email,
					password,
				},
				{
					onSuccess: () => {
						window.location.href = "/";
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

	// Show loading spinner while checking user count
	if (isCheckingUsers || (typeof userCount === "number" && userCount === 0)) {
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
				<div className="fade-in slide-in-from-bottom-4 animate-in text-center duration-500">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 backdrop-blur-sm">
						<KeyRound className="h-6 w-6 text-primary" />
					</div>
					<h2 className="font-bold text-2xl tracking-tight">Welcome back</h2>
					<p className="mt-2 text-muted-foreground text-sm">
						Enter your credentials to access your account
					</p>
				</div>

				<GlassCard className="fade-in zoom-in-95 animate-in border-border/50 shadow-xl backdrop-blur-xl delay-100 duration-500">
					<form className="space-y-4" onSubmit={handleSubmit}>
						{/* ─── Email Field ─────────────────────────────── */}
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<div className="group relative">
								<Mail className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
								<Input
									className="border-border/50 bg-muted/30 pl-9 transition-all focus-visible:ring-primary/20"
									disabled={isLoading}
									id="email"
									onChange={(e) => setEmail(e.target.value)}
									placeholder="name@example.com"
									required
									type="email"
									value={email}
								/>
							</div>
						</div>

						{/* ─── Password Field ──────────────────────────── */}
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="password">Password</Label>
								{/* <Link
									className="text-primary/80 text-xs transition-colors hover:text-primary hover:underline"
									href="/forgot-password"
								>
									Forgot password?
								</Link> */}
							</div>
							<div className="group relative">
								<Lock className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
								<Input
									className="border-border/50 bg-muted/30 pl-9 transition-all focus-visible:ring-primary/20"
									disabled={isLoading}
									id="password"
									minLength={8}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="••••••••"
									required
									type="password"
									value={password}
								/>
							</div>
						</div>

						{/* ─── Error Message ───────────────────────────── */}
						{error && (
							<div className="fade-in slide-in-from-top-2 animate-in rounded-md bg-destructive/10 p-3 text-destructive text-sm">
								<p className="font-medium">Authentication Failed</p>
								<p className="text-xs opacity-90">{error}</p>
							</div>
						)}

						{/* ─── Submit Button ───────────────────────────── */}
						<Button
							className="group/btn relative w-full overflow-hidden"
							disabled={isLoading}
							type="submit"
						>
							<span
								className={cn(
									"flex items-center gap-2 transition-all",
									isLoading
										? "opacity-0"
										: "opacity-100 group-hover/btn:translate-x-1",
								)}
							>
								Sign In
								{!isLoading && <ArrowRight className="h-4 w-4" />}
							</span>
							{isLoading && (
								<div className="absolute inset-0 flex items-center justify-center">
									<Loader2 className="h-4 w-4 animate-spin" />
								</div>
							)}
						</Button>
					</form>
				</GlassCard>
			</div>
		</div>
	);
}
