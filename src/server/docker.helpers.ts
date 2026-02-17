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
			exposedPorts[`${portData.port}/tcp`] = {};

			// Direct Port Mapping (e.g., 8080:3000)
			if (portData.exposedPort) {
				portBindings[`${portData.port}/tcp`] = [
					{ HostPort: String(portData.exposedPort) },
				];
			}

			// Traefik Domain Routing
			if (portData.domain) {
				// Parse the URL to find Protocol & Hostname
				let rawDomain = portData.domain.trim();
				let isHttps = false;

				if (rawDomain.startsWith("https://")) {
					isHttps = true;
					rawDomain = rawDomain.replace("https://", "");
				} else if (rawDomain.startsWith("http://")) {
					isHttps = false;
					rawDomain = rawDomain.replace("http://", "");
				}

				const cleanDomain = (rawDomain.split("/")[0] ?? "").toLowerCase();

				//  Generate Unique Router Name
				const slug = cleanDomain.replace(/[^a-z0-9]/g, "-");
				const hash = createHash("sha256")
					.update(`${cleanDomain}-${portData.port}`)
					.digest("hex")
					.substring(0, 8);

				const routerName = `${slug}-${hash}`;

				// Common Labels
				labels[`traefik.http.services.${routerName}.loadbalancer.server.port`] =
					`${portData.port}`;

				if (isHttps) {
					// HTTPS Configuration
					// Router Name: Needs to be unique for secure vs insecure
					const secureRouterName = `${routerName}-secure`;

					labels[`traefik.http.routers.${secureRouterName}.rule`] =
						`Host(\`${cleanDomain}\`)`;
					labels[`traefik.http.routers.${secureRouterName}.entrypoints`] =
						"websecure";

					// Enable TLS using the resolver defined in your Traefik static config
					// Usually named "myresolver" or "letsencrypt"
					labels[`traefik.http.routers.${secureRouterName}.tls`] = "true";
					labels[`traefik.http.routers.${secureRouterName}.tls.certresolver`] =
						"myresolver";
					labels[`traefik.http.routers.${secureRouterName}.service`] =
						routerName; // Link to service
				} else {
					// HTTP Configuration
					labels[`traefik.http.routers.${routerName}.rule`] =
						`Host(\`${cleanDomain}\`)`;
					labels[`traefik.http.routers.${routerName}.entrypoints`] = "web";
				}
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
				NetworkMode: "vortex-net", // Ensure Traefik is on this same network!
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
