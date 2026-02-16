import { headers } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/server/db";
import { githubApps, projects } from "@/server/db/schema";
import { eq, like } from "drizzle-orm";
import DeploymentService from "@/server/services/deployment.service";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature =(await headers()).get("x-hub-signature-256") || "";
    
    // 1. FETCH ALL APPS
    // (In a huge system, cache this. For <100 apps, DB query is fine)
    const apps = await db.query.githubApps.findMany();
    
    let verifiedApp = null;

    // 2. FIND WHICH APP SIGNED THIS REQUEST
    for (const app of apps) {
      const expected = "sha256=" + crypto
        .createHmac("sha256", app.webhookSecret)
        .update(rawBody)
        .digest("hex");
        
      if (signature === expected) {
        verifiedApp = app;
        break; // Found it!
      }
    }

    if (!verifiedApp) {
      return NextResponse.json({ error: "No matching webhook secret found" }, { status: 401 });
    }

    // 3. PROCESS THE PUSH
    const payload = JSON.parse(rawBody);
    if ( (await headers()).get("x-github-event") === "push") {
       const repoName = payload.repository.full_name;
       const branch = payload.ref.replace("refs/heads/", "");

       console.log(`[Webhook] Verified by '${verifiedApp.name}' for ${repoName}`);

      const projectsList = await db.query.projects.findMany({
        where: eq(projects.repoUrl, repoName),
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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}