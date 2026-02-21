import {
	createContext,
	type Dispatch,
	type SetStateAction,
	useContext,
} from "react";

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

export type ProjectFormData = {
	// Source
	projectName: string;
	sourceType: SourceType;
	repoUrl: string;
	gitBuildMethod: GitBuildMethod;
	dockerfilePathForGit: string;
	branch: string;
	imageName: string;
	imageTag: string;
	dockerfilePath: string;
	buildContextPath: string;
	selectedGithubAppId: string | null;

	// Build
	overrideInstallCommand: boolean;
	installCommand: string;
	overrideBuildCommand: boolean;
	buildCommand: string;
	overrideStartCommand: boolean;
	startCommand: string;
	rootPath: string;

	// Runtime
	runtimePorts: RuntimePortEntry[];
	cpuLimit: string;
	memoryLimit: string;

	// Env
	envVars: EnvVarEntry[];
};

export type ProjectFormContextType = {
	formData: ProjectFormData;
	updateForm: (updates: Partial<ProjectFormData>) => void;
	stepIndex: number;
	setStepIndex: Dispatch<SetStateAction<number>>;
	setFormError: (msg: string) => void;
};

export const ProjectFormContext = createContext<ProjectFormContextType | null>(
	null,
);

export function useProjectForm() {
	const ctx = useContext(ProjectFormContext);
	if (!ctx) throw new Error("useProjectForm must be used within provider");
	return ctx;
}
