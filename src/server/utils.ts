type DockerStats = {
	cpu_stats: {
		cpu_usage: {
			total_usage: number;
		};
		system_cpu_usage: number;
		online_cpus: number;
	};
	precpu_stats: {
		cpu_usage: {
			total_usage: number;
		};
		system_cpu_usage: number;
	};
	memory_stats: {
		usage: number;
		limit: number;
		stats?: {
			cache?: number;
		};
	};
};

type ContainerMetrics = {
	cpu: string; // Percentage as string, e.g. "12.50"
	memory: number; // Memory usage in bytes
	memoryLimit: number; // Memory limit in bytes
	memoryPercent: string; // Memory percentage as string, e.g. "45.00"
};

export function calculateContainerMetrics(
	stats: DockerStats,
): ContainerMetrics {
	// 1. CPU Percentage Calculation
	const cpuDelta =
		stats.cpu_stats.cpu_usage.total_usage -
		stats.precpu_stats.cpu_usage.total_usage;
	const systemDelta =
		stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
	const cpuCount = stats.cpu_stats.online_cpus || 1;

	let cpuPercent = 0.0;
	if (systemDelta > 0.0 && cpuDelta > 0.0) {
		cpuPercent = (cpuDelta / systemDelta) * cpuCount * 100.0;
	}

	// 2. Memory Usage Calculation
	// Docker includes "cache" in usage, which is misleading. We subtract it.
	const memUsage =
		stats.memory_stats.usage - (stats.memory_stats.stats?.cache || 0);
	const memLimit = stats.memory_stats.limit;
	const memPercent = (memUsage / memLimit) * 100.0;

	return {
		cpu: cpuPercent.toFixed(2), // String "12.50"
		memory: memUsage, // Bytes
		memoryLimit: memLimit, // Bytes
		memoryPercent: memPercent.toFixed(2), // String "45.00"
	};
}

export function sanitizeUrl(input: string): string | undefined {
	try {
		const base = new URL(input).origin.toLowerCase();
		console.log(`Sanitized URL: ${base} from input: ${input}`);
		if (base === "null" || base === "undefined") {
			throw new Error("Invalid URL after sanitization");
		}
		return base;
	} catch (e) {
		console.error(`URL sanitization failed for input: ${input}`, e);
		return undefined;
	}
}

import { eq } from "drizzle-orm";
import { App } from "octokit";
import { db } from "@/server/db";
import { githubApps } from "@/server/db/schema";

export async function getInstallationToken(appId: string) {
	// 1. Fetch App Credentials from DB
	const appData = await db.query.githubApps.findFirst({
		where: eq(githubApps.id, appId),
	});

	if (!appData) throw new Error("GitHub App not found");

	const app = new App({
		appId: appData.appId,
		privateKey: appData.privateKey,
	});

	const { data: installations } =
		await app.octokit.rest.apps.listInstallations();

	const installation = installations[0];
	if (!installation) {
		throw new Error("App is not installed on any GitHub account yet.");
	}

	const { data: tokenData } =
		await app.octokit.rest.apps.createInstallationAccessToken({
			installation_id: installation.id,
		});

	return tokenData.token;
}
