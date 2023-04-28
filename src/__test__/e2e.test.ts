import { exec as execCb } from "child_process";
import fs from "fs/promises";
import ts from "typescript";
import { promisify } from "util";
import { afterAll, beforeAll, expect, test } from "vitest";

const exec = promisify(execCb);

beforeAll(async () => {
  await fs.rename("./prisma", "./prisma-old").catch(() => {});
});

afterAll(async () => {
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
        sprockets   Sprocket[]
    }
    
    model Sprocket {
        id          String @id
        users       TestUser[]
    }`
    );

    // Run Prisma commands without fail
    await exec("yarn prisma db push");
    await exec("yarn prisma generate");

    const generatedSource = await fs.readFile("./prisma/generated/types.ts", {
      encoding: "utf-8",
    });
    expect(generatedSource.includes("SprocketToTestUser")).toBeTruthy();

    // const sourceFile = ts.createSourceFile(
    //   "./prisma/generated/types.ts",
    //   generatedSource,
    //   ts.ScriptTarget.ES2022,
    //   true
    // );
  },
  { timeout: 20000 }
);
