import { createHash } from "node:crypto";
import { docker } from "./docker";

export const createContainer = async ({
	imageName,
	containerName,
	ports,
	envVars,
}: {
	imageName: string;
	containerName: string;
	ports: {
		port: number;
		domain?: string | null;
		exposedPort?: number | null;
	}[];
	envVars?: Record<string, string>;
}) => {
	try {
		const labels: Record<string, string> = {
			"traefik.enable": "true",
		};

		const exposedPorts: Record<string, Record<string, unknown>> = {};
		const portBindings: Record<string, { HostPort: string }[]> = {};

		ports.forEach((portData) => {
			// Always mark the port as exposed inside the container
			exposedPorts[`${portData.port}/tcp`] = {};

			// If exposedPort is provided, bind the container port to the host port
			if (portData.exposedPort) {
				portBindings[`${portData.port}/tcp`] = [
					{ HostPort: String(portData.exposedPort) },
				];
			}

			// If domain is provided, configure Traefik routing
			if (portData.domain) {
				const slug = portData.domain.toLowerCase().replace(/[^a-z0-9]/g, "-");
				const hash = createHash("sha256")
					.update(`${portData.domain}-${portData.port}`)
					.digest("hex")
					.substring(0, 8);
				const routerName = `${slug}-${hash}`;

				const domain = portData.domain.toLowerCase();

				labels[`traefik.http.routers.${routerName}.rule`] =
					`Host(\`${domain}\`)`;
				labels[`traefik.http.routers.${routerName}.entrypoints`] = "web";
				labels[`traefik.http.services.${routerName}.loadbalancer.server.port`] =
					`${portData.port}`;
			}
		});

		const container = await docker.createContainer({
			Image: imageName,
			name: containerName,

			Labels: labels,

			ExposedPorts: exposedPorts,

			Env: envVars
				? Object.entries(envVars).map(([key, value]) => `${key}=${value}`)
				: undefined,
			HostConfig: {
				NetworkMode: "vortex-net",
				RestartPolicy: { Name: "always" },
				PortBindings: portBindings,
			},
		});

		return container;
	} catch (error) {
		console.error("Error creating container:", error);
		throw error;
	}
};
