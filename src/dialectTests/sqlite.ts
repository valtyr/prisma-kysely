import Database from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";

import { POSTGRES_URL, preparePrisma } from "~/dialectTests/common";

const main = async () => {
  await preparePrisma("sqlite");
  const db = new Kysely<any>({
    dialect: new SqliteDialect({
      database: new Database("./prisma/dev.db"),
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
