import { exec as execCb } from "child_process";
import fs from "fs/promises";
import { promisify } from "util";
import { afterEach, beforeEach, expect, test } from "vitest";

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

test(
  "End to end test - separate entrypoints",
  async () => {
    // Initialize prisma:
    await exec("yarn prisma init --datasource-provider mysql");

    // Set up a schema
    await fs.writeFile(
      "./prisma/schema.prisma",
      `datasource db {
        provider = "mysql"
        url      = "mysql://root:password@localhost:3306/test"
    }

    generator kysely {
        provider  = "node ./dist/bin.js"
        enumFileName = "enums.ts"
    }

    enum TestEnum {
        A
        B
        C
    }
    
    model TestUser {
        id          String @id
        name        String
        age         Int
        rating      Float
        updatedAt   DateTime
        abc         TestEnum
    }`
    );

    // Run Prisma commands without fail
    // await exec("yarn prisma db push"); -- can't push to mysql, enums not supported in sqlite
    await exec("yarn prisma generate"); //   so just generate

    const typeFile = await fs.readFile("./prisma/generated/types.ts", {
      encoding: "utf-8",
    });
    expect(typeFile).not.toContain("export const");
    expect(typeFile).toContain(`import type { TestEnum } from "./enums";`);

    const enumFile = await fs.readFile("./prisma/generated/enums.ts", {
      encoding: "utf-8",
    });
    expect(enumFile).toEqual(`export type TestEnum = "A" | "B" | "C";
export const TestEnum = {
  A: "A",
  B: "B",
  C: "C",
};
`);
  },
  { timeout: 20000 }
);

test(
  "End to end test - separate entrypoints but no enums",
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
        enumFileName = "enums.ts"
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

    // Shouldn't have an empty import statement
    const typeFile = await fs.readFile("./prisma/generated/types.ts", {
      encoding: "utf-8",
    });
    expect(typeFile).not.toContain('from "./enums"');

    // Shouldn't have generated an empty file
    expect(
      fs.readFile("./prisma/generated/enums.ts", {
        encoding: "utf-8",
      })
    ).rejects.toThrow();
  },
  { timeout: 20000 }
);
