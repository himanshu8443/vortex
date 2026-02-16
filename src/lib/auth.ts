import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/server/db";

export const auth = betterAuth({
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
