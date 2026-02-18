export type SourceType = "GIT" | "DOCKERFILE" | "DOCKER_IMAGE";
export type GitBuildMethod = "NIXPACKS" | "DOCKERFILE_PATH";

export type RuntimePortEntry = {
	id: string;
	port: string;
	domain: string;
	exposedPort: string;
};

export type EnvVarEntry = {
	id: string;
	key: string;
	value: string;
};

export const createRuntimePortEntry = (id: string): RuntimePortEntry => ({
	id,
	port: "",
	domain: "",
	exposedPort: "",
});

export const createEnvVarEntry = (id: string): EnvVarEntry => ({
	id,
	key: "",
	value: "",
});

export function extractGitHubRepoPath(url: string) {
	const trimmed = url.trim();
	if (!trimmed) return null;
	const match = trimmed.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/i);
	if (!match) return null;
	return `${match[1]}/${match[2]}`;
}
