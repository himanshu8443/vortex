import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const createId = () => crypto.randomUUID();

export const PROJECT_SOURCE_TYPES = [
	"GIT",
	"DOCKER_REGISTRY",
	"MANUAL",
] as const;
export type ProjectSourceType = (typeof PROJECT_SOURCE_TYPES)[number];

export const PROJECT_BUILD_TYPES = [
	"DOCKERFILE",
	"COMPOSE",
	"NIXPACKS",
] as const;
export type ProjectBuildType = (typeof PROJECT_BUILD_TYPES)[number];

export const PROJECT_STATUSES = [
	"IDLE",
	"STARTING",
	"DEPLOYING",
	"RUNNING",
	"FAILED",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PORT_PROTOCOLS = ["http", "tcp"] as const;
export type PortProtocol = (typeof PORT_PROTOCOLS)[number];

export const DEPLOYMENT_STATUSES = [
	"QUEUED",
	"BUILDING",
	"READY",
	"FAILED",
	"SUPERSEDED",
] as const;
export type DeploymentStatus = (typeof DEPLOYMENT_STATUSES)[number];

export const DEPLOYMENT_TRIGGERS = ["manual", "webhook", "redeploy"] as const;
export type DeploymentTrigger = (typeof DEPLOYMENT_TRIGGERS)[number];

// 1. USERS
export const user = sqliteTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
	image: text("image"),
	wildcardDomain: text("wildcard_domain"),
	vortexDomain: text("vortex_domain"),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
	id: text("id").primaryKey(),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
	token: text("token").notNull().unique(),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => user.id),
});

export const account = sqliteTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: integer("access_token_expires_at", {
		mode: "timestamp",
	}),
	refreshTokenExpiresAt: integer("refresh_token_expires_at", {
		mode: "timestamp",
	}),
	scope: text("scope"),
	password: text("password"),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// 2. PROJECTS: The "Container" for settings
export const projects = sqliteTable("projects", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	userId: text("user_id").references(() => user.id),
	name: text("name").notNull(),

	// Source config
	sourceType: text("source_type", { enum: PROJECT_SOURCE_TYPES }).notNull(),
	buildType: text("build_type", { enum: PROJECT_BUILD_TYPES }).default(
		"DOCKERFILE",
	),
	githubAppId: text("github_app_id").references(() => githubApps.id),

	image: text("image"), // For DOCKER_REGISTRY source
	repoUrl: text("repo_url"), // For GIT source
	branch: text("branch"), // For GIT source
	rootDirectory: text("root_directory").default("/"), // For monorepos

	// Dockerfile Config
	dockerfilePath: text("dockerfile_path").default("Dockerfile"), // For GIT
	dockerfileContent: text("dockerfile_content"), // For MANUAL

	// Compose Config
	composeFilePath: text("compose_file_path").default("docker-compose.yml"), // For GIT
	composeFileContent: text("compose_file_content"), // For MANUAL

	// Builder Config (Railpack/Nixpacks)
	buildConfig: text("build_config"), // JSON string of the build plan (providers, phases, etc.)
	installCommand: text("install_command"), // User override: e.g. "npm install --legacy-peer-deps"
	buildCommand: text("build_command"), // User override: e.g. "npm run build:prod"
	startCommand: text("start_command"), // User override: e.g. "node dist/index.js"

	// Runtime config
	envVars: text("env_vars"), // JSON string
	cpuLimit: text("cpu_limit").default("0.5"), // e.g. 0.5 vCPU
	memoryLimit: text("memory_limit").default("512m"), // e.g. 512MB

	// Current Live State
	containerId: text("container_id"),
	currentDeploymentId: text("current_deployment_id"),
	activeDeploymentId: text("active_deployment_id"),
	status: text("status", { enum: PROJECT_STATUSES }).default("IDLE"),
	createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
		() => new Date(),
	),
	updatedAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(
		() => new Date(),
	),
});

export const projectPorts = sqliteTable("project_ports", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	projectId: text("project_id").references(() => projects.id, {
		onDelete: "cascade",
	}),
	port: integer("port").notNull(), // e.g., 8080
	domain: text("domain"), // e.g., "app.vortex.local"
	exposedPort: integer("exposed_port"),
});

// 3. DEPLOYMENTS: The History, Logs, and Screenshots
export const deployments = sqliteTable("deployments", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	projectId: text("project_id")
		.references(() => projects.id, { onDelete: "cascade" })
		.notNull(),

	status: text("status", { enum: DEPLOYMENT_STATUSES }).notNull(),
	commitHash: text("commit_hash"),
	commitMessage: text("commit_message"),

	containerId: text("container_id"), // For cleanup and rollback

	// Logs & Assets
	buildLogs: text("build_logs"),
	screenshotUrl: text("screenshot_url"),

	// NEW: Store the Railpack build plan for debugging
	buildPlan: text("build_plan"),

	// NEW: Useful for that "Started/Ended" UI
	trigger: text("trigger", { enum: DEPLOYMENT_TRIGGERS }).default("manual"),

	// NEW: For Docker cleanup and rollback
	imageTag: text("image_tag"), // e.g., "vortex-app:build-xyz"

	// Timing
	startedAt: integer("started_at", { mode: "timestamp" }),
	endedAt: integer("ended_at", { mode: "timestamp" }),
	duration: integer("duration"), // in seconds
});

export const githubApps = sqliteTable("github_apps", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	name: text("name").notNull(), // e.g. "Personal" or "Work"

	// App Credentials (from Manifest flow)
	appId: text("app_id").notNull(),
	clientId: text("client_id").notNull(),
	clientSecret: text("client_secret").notNull(),
	webhookSecret: text("webhook_secret").notNull(),
	privateKey: text("private_key").notNull(),

	// Metadata
	htmlUrl: text("html_url"), // Link to app on GitHub
	createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
		() => new Date(),
	),
});
