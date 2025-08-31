import type { SqliteDatabase, SqliteStatement } from "kysely";
import { Kysely, SqliteDialect } from "kysely";
import type {
  DatabaseSyncOptions,
  SQLInputValue,
  StatementSync,
} from "node:sqlite";
import { DatabaseSync } from "node:sqlite";

import { preparePrisma } from "~/dialectTests/common";

class KyselyNodeSQLiteDatabase implements SqliteDatabase {
  private readonly database: DatabaseSync;

  constructor(url: string | Buffer | URL, options?: DatabaseSyncOptions) {
    this.database = new DatabaseSync(url, options);
  }

  close(): void {
    this.database.close();
  }
  prepare(sql: string): SqliteStatement {
    return new KyselyNodeSQLiteStatement(this.database.prepare(sql));
  }
}

class KyselyNodeSQLiteStatement implements SqliteStatement {
  private readonly statement: StatementSync;

  constructor(statement: StatementSync) {
    this.statement = statement;
  }

  iterate(parameters: ReadonlyArray<SQLInputValue>): IterableIterator<unknown> {
    return this.statement.iterate(...parameters);
  }

  reader: boolean;
  all(parameters: ReadonlyArray<SQLInputValue>): unknown[] {
    return this.statement.all(...parameters);
  }
  run(parameters: ReadonlyArray<SQLInputValue>): {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  } {
    return this.statement.run(...parameters);
  }
}

const main = async () => {
  await preparePrisma("sqlite");

  const db = new Kysely<never>({
    dialect: new SqliteDialect({
      database: new KyselyNodeSQLiteDatabase("./prisma/dev.db"),
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
