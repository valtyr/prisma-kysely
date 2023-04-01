import { exec as execCb } from "child_process";
import fs from "fs/promises";
import { promisify } from "util";
import { afterEach, beforeAll, beforeEach, expect, test } from "vitest";

const exec = promisify(execCb);

beforeEach(async () => {
  await fs.rename("./prisma", "./prisma-old").catch(() => {});
});

afterEach(async () => {
  await fs
    .rm("./prisma", {
      force: true,
      recursive: true,
    })
    .catch(() => {});
  await fs.rename("./prisma-old", "./prisma").catch(() => {});
});

test(
  "End to end test",
  async () => {
    // Initialize prisma:
    await exec("yarn prisma init --datasource-provider sqlite");

    // Set up a schema
    await fs.writeFile(
      "./prisma/schema.prisma",
      `datasource db {
        provider = "sqlite"
        url      = "file:./dev.db"
    }

    generator kysely {
        provider  = "node ./dist/bin.js"
    }
    
    model TestUser {
        id          String @id
        name        String
        age         Int
        rating      Float
        updatedAt   DateTime
    }`
    );

    // Run Prisma commands without fail
    await exec("yarn prisma db push");
    await exec("yarn prisma generate");
  },
  { timeout: 20000 }
);
