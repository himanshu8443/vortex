import crypto from "node:crypto";
import { eq, or } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { projects } from "@/server/db/schema";
import DeploymentService from "@/server/services/deployment.service";

export async function POST(req: Request) {
	try {
		const rawBody = await req.text();
		const signature = (await headers()).get("x-hub-signature-256") || "";

		// 1. FETCH ALL APPS
		// (In a huge system, cache this. For <100 apps, DB query is fine)
		const apps = await db.query.githubApps.findMany();

		let verifiedApp = null;

		// 2. FIND WHICH APP SIGNED THIS REQUEST
		for (const app of apps) {
			const expected = `sha256=${crypto
				.createHmac("sha256", app.webhookSecret)
				.update(rawBody)
				.digest("hex")}`;

			if (
				signature.length === expected.length &&
				crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
			) {
				verifiedApp = app;
				break; // Found it!
			}
		}

		if (!verifiedApp) {
			return NextResponse.json(
				{ error: "No matching webhook secret found" },
				{ status: 401 },
			);
		}

		// 3. PROCESS THE PUSH
		const payload = JSON.parse(rawBody);
		if ((await headers()).get("x-github-event") === "push") {
			const repoName = payload.repository.full_name;
			const branch = payload.ref?.replace("refs/heads/", "");

			console.log(
				`[Webhook] Verified by '${verifiedApp.name}' for ${repoName}`,
			);

			const htmlUrl = payload.repository.html_url;
			const cloneUrl = payload.repository.clone_url;
			const sshUrl = payload.repository.ssh_url;

			const projectsList = await db.query.projects.findMany({
				where: or(
					htmlUrl ? eq(projects.repoUrl, htmlUrl) : undefined,
					cloneUrl ? eq(projects.repoUrl, cloneUrl) : undefined,
					sshUrl ? eq(projects.repoUrl, sshUrl) : undefined,
					eq(projects.repoUrl, `https://github.com/${repoName}`),
					eq(projects.repoUrl, `https://github.com/${repoName}.git`),
				),
			});

			for (const project of projectsList) {
				if (project.branch === branch) {
					const deployService = new DeploymentService(project.id);
					const headCommitSha = payload.head_commit?.id;
					await deployService.startNewDeployment("webhook", headCommitSha);
				}
			}
		}

		return NextResponse.json({ success: true });
	} catch (e) {
		console.error("[Webhook Error]", e);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
