import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";

async function getAppUrl() {
	const [firstUser] = await db.select().from(user).limit(1);
	if (firstUser) {
		return firstUser?.vortexDomain || undefined;
	}
	return undefined;
}

export const auth = async () => {
	const appUrl = await getAppUrl();

	return betterAuth({
		baseURL: appUrl,
		trustedOrigins: ["*"],
		advanced: {
			useSecureCookies: false,
		},
		database: drizzleAdapter(db, {
			provider: "sqlite",
		}),
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false, // Critical since you can't verify email
			// THIS IS THE MAGIC PART
			async sendResetPassword(data) {
				console.log(`
        ┌─────────────────────────────────────────────────────────────┐
        │ 🔐 PASSWORD RESET REQUEST                                   │
        │ 👤 User: ${data.user.email}                                 │
        │                                                             │
        │ 👇 Copy this link to your browser to reset password:        │
        │ ${data.url}                                                 │
        └─────────────────────────────────────────────────────────────┘
        `);
			},
		},
	});
};
