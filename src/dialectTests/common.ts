import { exec as execCb } from "child_process";
import fs from "fs/promises";
import { promisify } from "util";

const exec = promisify(execCb);

type Dialect = "sqlite" | "postgresql" | "mysql";

export const POSTGRES_URL =
  "postgres://postgres:postgres@localhost:22331/postgres";
export const MYSQL_URL = "mysql://root:mysql@localhost:22332/test";

function generateDatasource(dialect: Dialect) {
  switch (dialect) {
    case "sqlite":
      return 'provider = "sqlite"\nurl = "file:./dev.db"';
    case "postgresql":
      return `provider = "postgresql"\nurl = "${POSTGRES_URL}"`;
    case "mysql":
      return `provider = "mysql"\nurl = "${MYSQL_URL}"`;
  }
}

export const generateSchema = (dialect: Dialect) => {
  return `datasource db {
        ${generateDatasource(dialect)}
    }
    
    generator kysely {
        provider  = "node ./dist/bin.js"
    }
    
    model Widget {
        int               Int      @id @default(autoincrement())
        dateTime          DateTime @default(now())
        string            String   @default("hello")
        boolean           Boolean  @default(true)
        bytes             Bytes    
        decimal           Decimal  @default(1.0)
        bigInt            BigInt   @default(1)
        float             Float    @default(1.0)
    }`;
};

export const preparePrisma = async (dialect: Dialect) => {
  console.log("🪄 Deleting old prisma directory");
  await fs.rm("./prisma", { recursive: true, force: true });

  console.log("🪄 Recreating prisma directory");
  await fs.mkdir("./prisma");

  console.log("🪄 Writing new schema");
  await fs.writeFile("./prisma/schema.prisma", generateSchema(dialect), {
    encoding: "utf-8",
  });
  console.log("🪄 Pushing schema to db");
  await exec("yarn prisma db push --force-reset");

  console.log("🪄 Generating new types");
  await exec("yarn prisma generate");
};
