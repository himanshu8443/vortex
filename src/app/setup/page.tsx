"use client";

import {
	ArrowRight,
	Loader2,
	Lock,
	Mail,
	ShieldCheck,
	User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
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

	const { data: userCount, isLoading: isCheckingUsers } =
		api.user.userCount.useQuery();

	useEffect(() => {
		if (!isCheckingUsers && typeof userCount === "number" && userCount > 0) {
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

	if (isCheckingUsers || (typeof userCount === "number" && userCount > 0)) {
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
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 shadow-lg shadow-primary/5 ring-1 ring-primary/20 backdrop-blur-sm">
						<ShieldCheck className="h-8 w-8 text-primary" />
					</div>
					<h2 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text font-bold text-3xl text-transparent tracking-tight">
						Welcome to Vortex
					</h2>
					<p className="mx-auto mt-3 max-w-xs text-muted-foreground text-sm">
						No users found. Create the initial administrator account to get
						started.
					</p>
				</div>

				<GlassCard className="fade-in zoom-in-95 animate-in border-border/50 p-8 shadow-2xl shadow-primary/5 backdrop-blur-xl delay-100 duration-500">
					<form className="space-y-5" onSubmit={handleSubmit}>
						<div className="space-y-2">
							<Label htmlFor="name">Full Name</Label>
							<div className="group relative">
								<User className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
								<Input
									className="h-10 border-border/50 bg-muted/30 pl-9 transition-all focus-visible:ring-primary/20"
									disabled={isLoading}
									id="name"
									onChange={(e) => setName(e.target.value)}
									placeholder="Admin User"
									required
									value={name}
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<div className="group relative">
								<Mail className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
								<Input
									className="h-10 border-border/50 bg-muted/30 pl-9 transition-all focus-visible:ring-primary/20"
									disabled={isLoading}
									id="email"
									onChange={(e) => setEmail(e.target.value)}
									placeholder="admin@example.com"
									required
									type="email"
									value={email}
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<div className="group relative">
								<Lock className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
								<Input
									className="h-10 border-border/50 bg-muted/30 pl-9 transition-all focus-visible:ring-primary/20"
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
							<p className="ml-1 text-[10px] text-muted-foreground">
								Must be at least 8 characters long
							</p>
						</div>

						{/* ─── Error Message ───────────────────────────── */}
						{error && (
							<div className="fade-in slide-in-from-top-2 animate-in rounded-md border border-destructive/20 bg-destructive/10 p-3 text-destructive text-sm">
								<p className="flex items-center gap-2 font-medium">
									Setup Failed
								</p>
								<p className="mt-1 text-xs opacity-90">{error}</p>
							</div>
						)}

						{/* ─── Submit Button ───────────────────────────── */}
						<Button
							className="group/btn relative h-11 w-full overflow-hidden font-medium text-base shadow-lg shadow-primary/10 transition-all hover:shadow-primary/20"
							disabled={isLoading}
							size="lg"
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
