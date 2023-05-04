import { Kysely, MysqlDialect } from "kysely";
import { createPool } from "mysql2";

import { preparePrisma } from "~/dialectTests/common";

const main = async () => {
  await preparePrisma("mysql");
  const db = new Kysely<never>({
    dialect: new MysqlDialect({
      pool: createPool({
        user: "root",
        password: "mysql",
        host: "localhost",
        database: "test",
        port: 22332,
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
