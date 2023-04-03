import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

import { POSTGRES_URL, preparePrisma } from "~/dialectTests/common";

const main = async () => {
  await preparePrisma("postgresql");
  const db = new Kysely<any>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: POSTGRES_URL,
      }),
    }),
  });

  await db
    .insertInto("Widget")
    .values({ bytes: Buffer.from([]) })
    .execute();

  const result = await db
    .selectFrom("Widget")
    .selectAll()
    .executeTakeFirstOrThrow();

  const entries = Object.entries(result).map(([key, value]) => ({
    key,
    value,
    typeOf: typeof value,
  }));
  entries.sort((a, b) => a.key.localeCompare(b.key));
  console.table(entries);

  await db.destroy();
};

main();
