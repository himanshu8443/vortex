import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "@/env";
import { db } from "@/server/db";

export const auth = betterAuth({
	trustedOrigins: env?.PUBLIC_URL ? [env.PUBLIC_URL] : ["*"],
	advanced: {
		useSecureCookies: env?.PUBLIC_URL?.startsWith("https://") ?? false,
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
