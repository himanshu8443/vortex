import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { env } from "@/env";
import * as schema from "@/server/db/schema";

type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

const globalForDrizzle = globalThis as unknown as {
	db: DrizzleClient | undefined;
};

function createDrizzleClient(): DrizzleClient {
	const dbUrl = env.DATABASE_URL ?? "file:./db.sqlite";
	const client = createClient({ url: dbUrl });
	return drizzle(client, { schema });
}

// Lazy initialization - only connect when first accessed, not during build
export const db = new Proxy({} as DrizzleClient, {
	get(_target, prop) {
		if (!globalForDrizzle.db) {
			globalForDrizzle.db = createDrizzleClient();
		}
		const value = globalForDrizzle.db[prop as keyof DrizzleClient];
		return typeof value === "function"
			? value.bind(globalForDrizzle.db)
			: value;
	},
});
