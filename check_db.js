import { createClient } from "@libsql/client";

const db = createClient({ url: "file:./db.sqlite" });
const result = await db.execute("SELECT count(*) as count FROM Project");
console.log("Count:", result.rows[0]);
