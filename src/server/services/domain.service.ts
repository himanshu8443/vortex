import { existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const CONFIG_DIR = process.env.TRAEFIK_CONFIG_DIR
	? process.env.TRAEFIK_CONFIG_DIR
	: join(process.cwd(), "traefik-config");

export class DomainService {
	constructor() {
		// Ensure directory exists on boot
		if (!existsSync(CONFIG_DIR)) {
			mkdirSync(CONFIG_DIR, { recursive: true });
			this.updateDashboardDomain("dashboard.localhost").catch(console.error);
		}
	}

	async updateDashboardDomain(userInput: string) {
		// 1. Sanitize & Parse
		let rawDomain = userInput.trim();
		let isHttps = false;

		if (rawDomain.startsWith("https://")) {
			isHttps = true;
			rawDomain = rawDomain.replace("https://", "");
		} else if (rawDomain.startsWith("http://")) {
			isHttps = false;
			rawDomain = rawDomain.replace("http://", "");
		}

		const cleanDomain = (rawDomain.split("/")[0] ?? "").toLowerCase();

		// 2. Build the Config Dynamically
		let config = "";

		if (isHttps) {
			config = `
http:
  routers:
    vortex-dashboard-router:
      rule: "Host(\`${cleanDomain}\`)"
      service: "vortex-dashboard-service"
      entryPoints:
        - "websecure"
      tls:
        certResolver: "myresolver" # Matches your docker-compose resolver
  services:
    vortex-dashboard-service:
      loadBalancer:
        servers:
          - url: "http://vortex-dashboard:3000"
`;
		} else {
			config = `
http:
  routers:
    vortex-dashboard-router:
      rule: "Host(\`${cleanDomain}\`)"
      service: "vortex-dashboard-service"
      entryPoints:
        - "web"
  services:
    vortex-dashboard-service:
      loadBalancer:
        servers:
          - url: "http://vortex-dashboard:3000"
`;
		}

		const filePath = join(CONFIG_DIR, "dashboard.yml");
		await writeFile(filePath, config, "utf-8");
	}
}
