import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { githubApps } from "@/server/db/schema";

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const code = searchParams.get("code");
	const stateRaw = searchParams.get("state"); // Gets back '{"name":"Work"}'

	if (!code) return NextResponse.json({ error: "No code" }, { status: 400 });

	try {
		// 1. Exchange code for secrets
		const response = await fetch(
			`https://api.github.com/app-manifests/${code}/conversions`,
			{
				method: "POST",
				headers: { Accept: "application/vnd.github+json" },
			},
		);
		const data = await response.json();

		// 2. Get the name we saved earlier
		const state = stateRaw
			? JSON.parse(decodeURIComponent(stateRaw))
			: { name: "GitHub App" };

		// 3. Insert
		await db.insert(githubApps).values({
			name: state.name,
			appId: data.id.toString(),
			clientId: data.client_id,
			clientSecret: data.client_secret,
			webhookSecret: data.webhook_secret,
			privateKey: data.pem,
			htmlUrl: data.html_url,
		});

		if (typeof data.slug === "string" && data.slug.length > 0) {
			return NextResponse.redirect(
				`https://github.com/apps/${data.slug}/installations/new`,
			);
		}

		return NextResponse.redirect(new URL("/settings?success=true", req.url));
	} catch {
		return NextResponse.json({ error: "Setup failed" }, { status: 500 });
	}
}
