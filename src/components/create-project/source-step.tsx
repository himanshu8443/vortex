import {
	Book,
	BookKey,
	BookLock,
	GitBranch,
	Github,
	Loader2,
	LockIcon,
	Plus,
	Terminal,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { GitBuildMethod, SourceType } from "./types";

interface SourceStepProps {
	projectName: string;
	onProjectNameChange: (v: string) => void;
	sourceType: SourceType;
	onSourceTypeChange: (v: SourceType) => void;
	repoUrl: string;
	onRepoUrlChange: (v: string) => void;
	repoValidationMessage: string;
	repoValidated: boolean;
	isValidatingRepo: boolean;
	onValidateRepo: () => void;
	gitBuildMethod: GitBuildMethod;
	onGitBuildMethodChange: (v: GitBuildMethod) => void;
	dockerfilePathForGit: string;
	onDockerfilePathForGitChange: (v: string) => void;
	imageName: string;
	onImageNameChange: (v: string) => void;
	imageTag: string;
	onImageTagChange: (v: string) => void;
	dockerfilePath: string;
	onDockerfilePathChange: (v: string) => void;
	buildContextPath: string;
	onBuildContextPathChange: (v: string) => void;
	branches: string[];
	branch: string;
	onBranchChange: (v: string) => void;

	// GitHub App integration
	githubApps: { id: string; name: string }[];
	selectedGithubAppId: string | null;
	onSelectGithubApp: (id: string | null) => void;
	githubRepos: {
		id: number;
		name: string;
		full_name: string;
		html_url: string;
		default_branch: string;
		private: boolean;
	}[];
	isLoadingRepos: boolean;
}

export function SourceStep({
	projectName,
	onProjectNameChange,
	sourceType,
	onSourceTypeChange,
	repoUrl,
	onRepoUrlChange,
	repoValidationMessage,
	repoValidated,
	isValidatingRepo,
	onValidateRepo,
	gitBuildMethod,
	onGitBuildMethodChange,
	dockerfilePathForGit,
	onDockerfilePathForGitChange,
	imageName,
	onImageNameChange,
	imageTag,
	onImageTagChange,
	dockerfilePath,
	onDockerfilePathChange,
	buildContextPath,
	onBuildContextPathChange,
	branches,
	branch,
	onBranchChange,

	githubApps,
	selectedGithubAppId,
	onSelectGithubApp,
	githubRepos,
	isLoadingRepos,
}: SourceStepProps) {
	// Auto-fill project name when selecting repo from dropdown
	const handleRepoSelect = (repoFullName: string) => {
		const repo = githubRepos.find((r) => r.full_name === repoFullName);
		if (!repo) return;

		onRepoUrlChange(repo.html_url);
		onBranchChange(repo.default_branch); // Auto-set default branch

		// Auto-set project name if empty
		if (!projectName) {
			onProjectNameChange(repo.name);
		}
	};

	return (
		<GlassCard className="space-y-4 rounded-lg border border-border/50 bg-card/20 p-4">
			<div className="space-y-2">
				<Label>Project Name</Label>
				<Input
					className="bg-muted/20"
					onChange={(e) => onProjectNameChange(e.target.value)}
					placeholder="my-awesome-app"
					value={projectName}
				/>
			</div>

			<div className="space-y-2">
				<Label>Select Source Type</Label>
				<div className="grid gap-3 md:grid-cols-3">
					{[
						{ key: "GIT", label: "Git Repository" },
						{ key: "DOCKERFILE", label: "Dockerfile" },
						{ key: "DOCKER_IMAGE", label: "Docker Image" },
					].map((option) => (
						<button
							className={cn(
								"group relative overflow-hidden rounded-lg border border-border/60 bg-card/20 p-3 text-left shadow-sm transition-all duration-300 hover:border-primary/30 hover:bg-muted/30 hover:shadow-md",
								sourceType === option.key
									? "border-primary/50 bg-primary/5 shadow-primary/10 ring-1 ring-primary/20"
									: "opacity-80 hover:opacity-100",
							)}
							key={option.key}
							onClick={() => onSourceTypeChange(option.key as SourceType)}
							type="button"
						>
							<div className="font-medium text-sm transition-colors group-hover:text-primary">
								<span
									className={cn(
										sourceType === option.key
											? "text-primary"
											: "text-foreground",
									)}
								>
									{option.label}
								</span>
							</div>
							{sourceType === option.key && (
								<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
							)}
						</button>
					))}
				</div>
			</div>

			{/* ─── GIT Source Fields ──────────────── */}
			{sourceType === "GIT" && (
				<div className="space-y-3 rounded-lg border border-border/60 bg-card/20 p-3 shadow-sm">
					{/* Source Selection Mode: Manual vs GitHub App */}
					<div className="space-y-3">
						<Label>Source Origin</Label>
						<div className="grid grid-cols-2 gap-3">
							<button
								className={cn(
									"group relative overflow-hidden rounded-lg border border-border/60 bg-card/20 p-3 text-left shadow-sm transition-all duration-300 hover:border-primary/30 hover:bg-muted/30 hover:shadow-md",
									!selectedGithubAppId
										? "border-primary/50 bg-primary/5 shadow-primary/10 ring-1 ring-primary/20"
										: "opacity-80 hover:opacity-100",
								)}
								onClick={() => onSelectGithubApp(null)}
								type="button"
							>
								<div className="flex items-center gap-2 font-medium text-sm transition-colors group-hover:text-primary">
									<Terminal
										className={cn(
											"h-4 w-4",
											!selectedGithubAppId
												? "text-primary"
												: "text-muted-foreground group-hover:text-primary",
										)}
									/>
									<span
										className={cn(
											!selectedGithubAppId ? "text-primary" : "text-foreground",
										)}
									>
										Public / Manual
									</span>
								</div>
								{!selectedGithubAppId && (
									<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
								)}
							</button>
							<button
								className={cn(
									"group relative overflow-hidden rounded-lg border border-border/60 bg-card/20 p-3 text-left shadow-sm transition-all duration-300 hover:border-primary/30 hover:bg-muted/30 hover:shadow-md",
									selectedGithubAppId
										? "border-primary/50 bg-primary/5 shadow-primary/10 ring-1 ring-primary/20"
										: "opacity-80 hover:opacity-100",
								)}
								onClick={() => onSelectGithubApp(githubApps[0]?.id ?? "new")}
								type="button"
							>
								<div className="flex items-center gap-2 font-medium text-sm transition-colors group-hover:text-primary">
									<Github
										className={cn(
											"h-4 w-4",
											selectedGithubAppId
												? "text-primary"
												: "text-muted-foreground group-hover:text-primary",
										)}
									/>
									<span
										className={cn(
											selectedGithubAppId ? "text-primary" : "text-foreground",
										)}
									>
										GitHub Account
									</span>
								</div>
								{selectedGithubAppId && (
									<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
								)}
							</button>
						</div>
					</div>

					{/* Manual input */}
					{!selectedGithubAppId && (
						<div className="fade-in zoom-in-95 animate-in space-y-2 duration-200">
							<Label>Repository URL</Label>
							<div className="flex items-center gap-2">
								<Input
									className="bg-muted/20"
									onChange={(e) => onRepoUrlChange(e.target.value)}
									placeholder="https://github.com/org/repo"
									value={repoUrl}
								/>
								<Button
									className="shrink-0"
									disabled={!repoUrl.trim() || isValidatingRepo}
									onClick={onValidateRepo}
									type="button"
									variant="outline"
								>
									{isValidatingRepo ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Validating...
										</>
									) : (
										"Validate"
									)}
								</Button>
							</div>
							{repoValidationMessage && (
								<span
									className={cn(
										"text-xs",
										repoValidated ? "text-primary" : "text-destructive",
									)}
								>
									{repoValidationMessage}
								</span>
							)}
						</div>
					)}

					{/* GitHub App selection UI */}
					{selectedGithubAppId && (
						<div className="fade-in zoom-in-95 animate-in space-y-4 duration-200">
							{/* Case 1: No Apps Connected */}
							{githubApps.length === 0 ? (
								<div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border/60 border-dashed bg-muted/20 p-6 text-center">
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
										<Github className="h-5 w-5 text-muted-foreground" />
									</div>
									<div className="space-y-1">
										<p className="font-medium text-sm">
											No GitHub accounts connected
										</p>
										<p className="text-muted-foreground text-xs">
											Connect your account to select repositories.
										</p>
									</div>
									<Button asChild size="sm" variant="outline">
										<Link href="/settings" target="_blank">
											Connect GitHub Account
										</Link>
									</Button>
								</div>
							) : (
								/* Case 2: Apps Connected */
								<>
									<div className="space-y-2">
										<Label>GitHub Account</Label>
										<Select
											onValueChange={(val) => {
												if (val === "new") {
													window.open("/settings", "_blank");
													return;
												}
												onSelectGithubApp(val);
											}}
											value={selectedGithubAppId}
										>
											<SelectTrigger className="w-full bg-muted/20">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{githubApps.map((app) => (
													<SelectItem key={app.id} value={app.id}>
														{app.name}
													</SelectItem>
												))}
												<SelectItem value="new">
													<span className="flex items-center gap-2 text-primary">
														<Plus className="h-3 w-3" />
														Add New Account
													</span>
												</SelectItem>
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-2">
										<Label>Repository</Label>
										<Select
											disabled={isLoadingRepos}
											onValueChange={handleRepoSelect}
											value={
												githubRepos.find((r) => r.html_url === repoUrl)
													?.full_name ?? ""
											}
										>
											<SelectTrigger className="w-full bg-muted/20">
												<SelectValue
													placeholder={
														isLoadingRepos
															? "Loading repositories..."
															: "Select a repository"
													}
												/>
											</SelectTrigger>
											<SelectContent className="max-h-[200px]">
												{githubRepos.length === 0 ? (
													<div className="p-2 text-center text-muted-foreground text-xs">
														No repositories found
													</div>
												) : (
													githubRepos.map((repo) => (
														<SelectItem key={repo.id} value={repo.full_name}>
															<span className="flex items-center gap-2">
																{repo.private ? (
																	<BookLock className="h-3 w-3" />
																) : (
																	<Book className="h-3 w-3" />
																)}
																{repo.full_name}
															</span>
														</SelectItem>
													))
												)}
											</SelectContent>
										</Select>
									</div>
								</>
							)}
						</div>
					)}

					{/* Branch selection */}
					<div className="space-y-2">
						<Label>Branch</Label>
						{branches.length > 0 ? (
							<Select onValueChange={onBranchChange} value={branch}>
								<SelectTrigger className="w-full bg-muted/20 font-mono text-sm">
									<SelectValue placeholder="Select branch" />
								</SelectTrigger>
								<SelectContent>
									{branches.map((b) => (
										<SelectItem key={b} value={b}>
											{b}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : (
							<Input
								className="bg-muted/20 font-mono text-sm"
								onChange={(e) => onBranchChange(e.target.value)}
								placeholder="main"
								value={branch}
							/>
						)}
					</div>

					{/* Build Method */}
					<div className="space-y-2 pt-1">
						<Label>Build Method</Label>
						<div className="grid gap-3 md:grid-cols-2">
							<button
								className={cn(
									"group relative overflow-hidden rounded-md border border-border/60 bg-card/20 p-2.5 text-left shadow-sm transition-all duration-300 hover:border-primary/30 hover:bg-muted/30 hover:shadow-md",
									gitBuildMethod === "NIXPACKS"
										? "border-primary/50 bg-primary/5 shadow-primary/10 ring-1 ring-primary/20"
										: "opacity-80 hover:opacity-100",
								)}
								onClick={() => onGitBuildMethodChange("NIXPACKS")}
								type="button"
							>
								<div className="font-medium text-sm transition-colors group-hover:text-primary">
									<span
										className={cn(
											gitBuildMethod === "NIXPACKS"
												? "text-primary"
												: "text-foreground",
										)}
									>
										Auto Detect (Nixpacks)
									</span>
								</div>
								{gitBuildMethod === "NIXPACKS" && (
									<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
								)}
							</button>
							<button
								className={cn(
									"group relative overflow-hidden rounded-lg border border-border/60 bg-card/20 p-2.5 text-left shadow-sm transition-all duration-300 hover:border-primary/30 hover:bg-muted/30 hover:shadow-md",
									gitBuildMethod === "DOCKERFILE_PATH"
										? "border-primary/50 bg-primary/5 shadow-primary/10 ring-1 ring-primary/20"
										: "opacity-80 hover:opacity-100",
								)}
								onClick={() => onGitBuildMethodChange("DOCKERFILE_PATH")}
								type="button"
							>
								<div className="font-medium text-sm transition-colors group-hover:text-primary">
									<span
										className={cn(
											gitBuildMethod === "DOCKERFILE_PATH"
												? "text-primary"
												: "text-foreground",
										)}
									>
										Dockerfile Path
									</span>
								</div>
								{gitBuildMethod === "DOCKERFILE_PATH" && (
									<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
								)}
							</button>
						</div>
						{gitBuildMethod === "DOCKERFILE_PATH" && (
							<Input
								className="bg-muted/20"
								onChange={(e) => onDockerfilePathForGitChange(e.target.value)}
								placeholder="/Dockerfile"
								value={dockerfilePathForGit}
							/>
						)}
					</div>
				</div>
			)}

			{/* ─── Docker Image Fields ───────────── */}
			{sourceType === "DOCKER_IMAGE" && (
				<div className="grid gap-3 rounded-lg border border-border/60 bg-card/20 p-3 shadow-sm md:grid-cols-2">
					<div className="space-y-2">
						<Label>Image Name</Label>
						<Input
							className="bg-muted/20"
							onChange={(e) => onImageNameChange(e.target.value)}
							placeholder="nginx"
							value={imageName}
						/>
					</div>
					<div className="space-y-2">
						<Label>Image Tag</Label>
						<Input
							className="bg-muted/20"
							onChange={(e) => onImageTagChange(e.target.value)}
							placeholder="latest"
							value={imageTag}
						/>
					</div>
				</div>
			)}

			{/* ─── Standalone Dockerfile Fields ──── */}
			{sourceType === "DOCKERFILE" && (
				<div className="grid gap-3 rounded-lg border border-border/60 bg-card/20 p-3 shadow-sm md:grid-cols-2">
					<div className="space-y-2">
						<Label>Dockerfile Path</Label>
						<Input
							className="bg-muted/20"
							onChange={(e) => onDockerfilePathChange(e.target.value)}
							placeholder="/Dockerfile"
							value={dockerfilePath}
						/>
					</div>
					<div className="space-y-2">
						<Label>Build Context Path (optional)</Label>
						<Input
							className="bg-muted/20"
							onChange={(e) => onBuildContextPathChange(e.target.value)}
							placeholder="/"
							value={buildContextPath}
						/>
					</div>
				</div>
			)}
		</GlassCard>
	);
}
