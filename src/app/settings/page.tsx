"use client";

import {
	Check,
	ExternalLink,
	Github,
	Link2,
	Loader2,
	Plus,
	Save,
	Settings,
	Trash2,
	User,
} from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/react";

function ProfileForm() {
	const { data: profile, isLoading } = api.user.getProfile.useQuery();
	const utils = api.useUtils();

	const [name, setName] = React.useState("");
	const [email, setEmail] = React.useState("");
	const [wildcardDomain, setWildcardDomain] = React.useState("");
	const [vortexDomain, setVortexDomain] = React.useState("");
	const [isSaving, setIsSaving] = React.useState(false);
	const [saveSuccess, setSaveSuccess] = React.useState(false);

	React.useEffect(() => {
		if (profile) {
			setName(profile.name || "");
			setEmail(profile.email || "");
			setWildcardDomain(profile.wildcardDomain || "");
			setVortexDomain(profile.vortexDomain || "");
		}
	}, [profile]);

	const updateProfile = api.user.updateProfile.useMutation({
		onSuccess: () => {
			void utils.user.getProfile.invalidate();
			setSaveSuccess(true);
			setIsSaving(false);
			setTimeout(() => setSaveSuccess(false), 3000);
		},
		onError: () => {
			setIsSaving(false);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setIsSaving(true);
		updateProfile.mutate({
			name,
			email,
			wildcardDomain: wildcardDomain || undefined,
			vortexDomain: vortexDomain || undefined,
		});
	};

	if (isLoading) {
		return (
			<GlassCard className="flex justify-center border border-border/60 p-8">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</GlassCard>
		);
	}

	return (
		<GlassCard className="border border-border/60">
			<form className="space-y-4" onSubmit={handleSubmit}>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="name">Display Name</Label>
						<Input
							className="bg-background/50"
							id="name"
							onChange={(e) => setName(e.target.value)}
							value={name}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input
							className="bg-background/50"
							id="email"
							onChange={(e) => setEmail(e.target.value)}
							type="email"
							value={email}
						/>
					</div>
				</div>

				<div className="space-y-2">
					<Label htmlFor="wildcard-domain">Wildcard Domain URL</Label>
					<Input
						className="bg-background/50"
						id="wildcard-domain"
						onChange={(e) => setWildcardDomain(e.target.value)}
						placeholder="e.g. https://.example.com"
						value={wildcardDomain}
					/>
					<p className="text-[10px] text-muted-foreground">
						{" "}
						Base URL pattern for deployments (include protocol).
					</p>
				</div>

				<div className="space-y-2">
					<Label htmlFor="vortex-domain">Vortex Domain URL</Label>
					<Input
						className="bg-background/50"
						id="vortex-domain"
						onChange={(e) => setVortexDomain(e.target.value)}
						placeholder="e.g. https://vortex.example.com"
						value={vortexDomain}
					/>
					<p className="text-[10px] text-muted-foreground">
						{" "}
						Full URL for accessing your Vortex dashboard.
					</p>
				</div>

				<div className="flex justify-end pt-2">
					<Button disabled={isSaving || !name || !email} type="submit">
						{isSaving ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Saving...
							</>
						) : saveSuccess ? (
							<>
								<Check className="mr-2 h-4 w-4" />
								Saved!
							</>
						) : (
							<>
								<Save className="mr-2 h-4 w-4" />
								Save Changes
							</>
						)}
					</Button>
				</div>
			</form>
		</GlassCard>
	);
}

export default function SettingsPage() {
	const [appName, setAppName] = React.useState("");
	const [isSubmitting, setIsSubmitting] = React.useState(false);

	const utils = api.useUtils();

	const { data: apps = [], isLoading } = api.github.listApps.useQuery();

	const deleteApp = api.github.deleteApp.useMutation({
		onSuccess: () => {
			void utils.github.listApps.invalidate();
		},
	});

	// ── GitHub App manifest flow ──────────────────────────────
	const startManifestFlow = (e: React.FormEvent) => {
		e.preventDefault();
		if (!appName.trim()) return;

		setIsSubmitting(true);

		const manifest = {
			name: `Vortex - ${appName.trim()}`,
			url: window.location.origin,
			hook_attributes: {
				url: `${window.location.origin}/api/webhook/github`,
			},
			redirect_url: `${window.location.origin}/api/github/callback`,
			setup_url: `${window.location.origin}/settings?success=true`,
			setup_on_update: true,
			public: false,
			default_permissions: {
				contents: "read",
				metadata: "read",
				pull_requests: "read",
			},
			default_events: ["push", "pull_request"],
		};

		const state = encodeURIComponent(JSON.stringify({ name: appName.trim() }));

		const form = document.createElement("form");
		form.method = "POST";
		form.action = `https://github.com/settings/apps/new?state=${state}`;

		const input = document.createElement("input");
		input.type = "hidden";
		input.name = "manifest";
		input.value = JSON.stringify(manifest);

		form.appendChild(input);
		document.body.appendChild(form);
		form.submit();
	};

	// ── Success banner (from callback redirect) ──────────────
	const [showSuccess, setShowSuccess] = React.useState(false);
	React.useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		if (params.get("success") === "true") {
			setShowSuccess(true);
			// Clean up URL
			window.history.replaceState({}, "", "/settings");
			const timeout = setTimeout(() => setShowSuccess(false), 5000);
			return () => clearTimeout(timeout);
		}
	}, []);

	return (
		<main className="mx-auto max-w-4xl px-6 py-10">
			{/* Page Header */}
			<div className="mb-8 flex items-center gap-3">
				<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg shadow-primary/20">
					<Settings className="h-5 w-5" />
				</div>
				<div>
					<h1 className="font-bold text-2xl tracking-tight">Settings</h1>
					<p className="text-muted-foreground text-sm">
						Manage your GitHub integrations and app configuration.
					</p>
				</div>
			</div>

			{/* Success Banner */}
			{showSuccess && (
				<div className="fade-in slide-in-from-top-2 mb-6 flex animate-in items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-400 text-sm">
					<div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
						<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 12 12">
							<title>Success</title>
							<path
								d="M2 6L5 9L10 3"
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
							/>
						</svg>
					</div>
					GitHub App connected successfully!
				</div>
			)}

			{/* General Settings Section */}
			<section className="mb-10">
				<div className="mb-4 flex items-center gap-2">
					<User className="h-5 w-5 text-muted-foreground" />
					<h2 className="font-semibold text-lg">General Settings</h2>
				</div>
				<p className="mb-6 text-muted-foreground text-sm leading-relaxed">
					Manage your personal account settings and domain preferences.
				</p>

				<ProfileForm />
			</section>

			{/* GitHub Integration Section */}
			<section>
				<div className="mb-4 flex items-center gap-2">
					<Github className="h-5 w-5 text-muted-foreground" />
					<h2 className="font-semibold text-lg">GitHub Apps</h2>
				</div>
				<p className="mb-6 text-muted-foreground text-sm leading-relaxed">
					Connect GitHub Apps to enable automatic deployments on push. Each app
					can be linked to a different GitHub account or organization.
				</p>

				{/* Add New App Form */}
				<GlassCard className="mb-6 border border-border/60">
					<div className="flex items-center gap-2 font-medium text-sm">
						<Plus className="h-4 w-4 text-primary" />
						Add GitHub App
					</div>
					<form
						className="flex flex-col gap-4 sm:flex-row sm:items-end"
						onSubmit={startManifestFlow}
					>
						<div className="flex-1 space-y-2">
							<Label
								className="text-muted-foreground text-xs"
								htmlFor="app-name"
							>
								Account Name
							</Label>
							<Input
								className="bg-background/50"
								id="app-name"
								onChange={(e) => setAppName(e.target.value)}
								placeholder="e.g. Personal, Work, My-Org"
								required
								value={appName}
							/>
						</div>
						<Button
							className="gap-2"
							disabled={!appName.trim() || isSubmitting}
							type="submit"
						>
							{isSubmitting ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									Redirecting…
								</>
							) : (
								<>
									<Github className="h-4 w-4" />
									Connect Account
								</>
							)}
						</Button>
					</form>
					<p className="text-muted-foreground text-xs leading-relaxed">
						You'll be redirected to GitHub to authorize the app. It will be
						created under your account with read-only permissions for repository
						contents and metadata.
					</p>
				</GlassCard>

				{/* Connected Apps List */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<h3 className="font-medium text-muted-foreground text-sm">
							Connected Apps
						</h3>
						{apps.length > 0 && (
							<Badge className="font-mono text-xs" variant="secondary">
								{apps.length}
							</Badge>
						)}
					</div>

					{isLoading ? (
						<GlassCard className="border border-border/60">
							<div className="flex items-center justify-center py-6">
								<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
							</div>
						</GlassCard>
					) : apps.length === 0 ? (
						<GlassCard className="border border-border/60 border-dashed">
							<div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
								<div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
									<Link2 className="h-5 w-5 text-muted-foreground" />
								</div>
								<p className="font-medium text-sm">No apps connected</p>
								<p className="max-w-xs text-muted-foreground text-xs">
									Add a GitHub App above to enable automatic deployments when
									you push to your repositories.
								</p>
							</div>
						</GlassCard>
					) : (
						apps.map((app) => (
							<GlassCard className="border border-border/60" key={app.id}>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#24292e] text-white shadow-sm">
											<Github className="h-5 w-5" />
										</div>
										<div>
											<div className="flex items-center gap-2">
												<p className="font-semibold text-sm">{app.name}</p>
												<Badge
													className="font-mono text-[10px]"
													variant="secondary"
												>
													ID: {app.appId}
												</Badge>
											</div>
											<p className="text-muted-foreground text-xs">
												Connected{" "}
												{app.createdAt
													? new Date(app.createdAt).toLocaleDateString(
															"en-US",
															{
																month: "short",
																day: "numeric",
																year: "numeric",
															},
														)
													: "recently"}
											</p>
										</div>
									</div>

									<div className="flex items-center gap-2">
										{app.htmlUrl && (
											<Button
												asChild
												className="gap-1.5 text-muted-foreground text-xs"
												size="sm"
												variant="ghost"
											>
												<a
													href={app.htmlUrl}
													rel="noopener noreferrer"
													target="_blank"
												>
													<ExternalLink className="h-3.5 w-3.5" />
													GitHub
												</a>
											</Button>
										)}
										<Separator className="h-6" orientation="vertical" />
										<Button
											className="gap-1.5 text-destructive text-xs hover:bg-destructive/10 hover:text-destructive"
											disabled={deleteApp.isPending}
											onClick={() => deleteApp.mutate({ id: app.id })}
											size="sm"
											variant="ghost"
										>
											{deleteApp.isPending ? (
												<Loader2 className="h-3.5 w-3.5 animate-spin" />
											) : (
												<Trash2 className="h-3.5 w-3.5" />
											)}
											Remove
										</Button>
									</div>
								</div>
							</GlassCard>
						))
					)}
				</div>
			</section>
		</main>
	);
}
