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

	async updateDashboardDomain(newDomain: string) {
		const cleanDomain = newDomain.trim().toLowerCase();

		const config = `
http:
  routers:
    vortex-dashboard-router:
      rule: "Host(\`${cleanDomain}\`)"
      service: "vortex-dashboard-service"
      entryPoints:
        - "web"
        # - "websecure" # Uncomment later for HTTPS

  services:
    vortex-dashboard-service:
      loadBalancer:
        servers:
          # This connects to the internal container name/port
          - url: "http://vortex-dashboard:3000"
`;

		const filePath = join(CONFIG_DIR, "dashboard.yml");
		await writeFile(filePath, config, "utf-8");

		console.log(
			`Traefik updated! Dashboard is now accessible at http://${cleanDomain}`,
		);
	}
}
