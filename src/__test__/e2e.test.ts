import { beforeAll, expect, setDefaultTimeout, test } from "bun:test";
import { mkdtemp, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

setDefaultTimeout(20_000);

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const GENERATOR_PATH = path.join(PROJECT_ROOT, "dist/bin.js");

const pkg = await Bun.file(path.join(PROJECT_ROOT, "package.json")).json();
const PRISMA_PEER_DEP = pkg.peerDependencies?.prisma ?? ">=7.0.0";

let templateDir: string;

async function exec(cmd: string[], cwd: string, env?: Record<string, string>) {
  const proc = Bun.spawn(cmd, {
    cwd,
    stdout: "ignore",
    stderr: "pipe",
    stdin: "ignore",
    env: { ...process.env, ...env },
  });

  if ((await proc.exited) !== 0) {
    const text = await proc.stderr.text();
    throw new Error(`Command failed: ${cmd.join(" ")}\n${text}`);
  }
}

beforeAll(async () => {
  templateDir = await mkdtemp(
    path.join(os.tmpdir(), "prisma-kysely-template-")
  );
  await Bun.write(
    path.join(templateDir, "package.json"),
    JSON.stringify({ dependencies: { prisma: PRISMA_PEER_DEP } })
  );
  await exec(["bun", "install"], templateDir);
});

async function setupTest() {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "prisma-kysely-test-"));

  function tempPath(...parts: string[]) {
    return path.join(tempDir, ...parts);
  }

  function prisma(...args: string[]) {
    return exec(["bunx", "prisma", ...args], tempDir);
  }

  async function prismaInit(datasourceProvider: string, url: string) {
    await symlink(
      path.join(templateDir, "node_modules"),
      tempPath("node_modules")
    );
    await Bun.write(
      tempPath("package.json"),
      JSON.stringify({ dependencies: { prisma: PRISMA_PEER_DEP } })
    );
    await exec(
      ["bunx", "prisma", "init", "--datasource-provider", datasourceProvider],
      tempDir
    );

    await Bun.write(
      tempPath("prisma.config.ts"),
      `import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: "${url}",
  },
});
`
    );
  }

  return {
    tempDir,
    tempPath,
    prisma,
    prismaInit,
    async [Symbol.asyncDispose]() {
      await rm(tempDir, { force: true, recursive: true });
    },
  };
}

test("End to end test", async () => {
  await using t = await setupTest();
  await t.prismaInit("sqlite", "file:./dev.db");

  await Bun.write(
    t.tempPath("prisma/schema.prisma"),
    `datasource db {
      provider = "sqlite"
  }

  generator kysely {
      provider  = "node ${GENERATOR_PATH}"
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
      id          Int @id
      users       TestUser[]
  }`
  );

  await t.prisma("generate");

  const generatedSource = await Bun.file(
    t.tempPath("prisma/generated/types.ts")
  ).text();

  expect(generatedSource).toContain(`export type SprocketToTestUser = {
    A: number;
    B: string;
};`);

  expect(generatedSource).toContain("_SprocketToTestUser: SprocketToTestUser");

  expect(generatedSource).not.toContain("Insertable");
});

test("End to end test - with custom type override", async () => {
  await using t = await setupTest();
  await t.prismaInit("sqlite", "file:./dev.db");

  await Bun.write(
    t.tempPath("prisma/schema.prisma"),
    `datasource db {
      provider = "sqlite"
  }

  generator kysely {
      provider  = "node ${GENERATOR_PATH}"
  }

  model TestUser {
      id          String @id
      name        String

      /// @kyselyType('member' | 'owner')
      role        String
  }`
  );

  await t.prisma("generate");

  const generatedSource = await Bun.file(
    t.tempPath("prisma/generated/types.ts")
  ).text();

  expect(generatedSource).toContain(
    `export type TestUser = {
    id: string;
    name: string;
    /**
     * @kyselyType('member' | 'owner')
     */
    role: 'member' | 'owner';
};`
  );
});

test("End to end test - separate entrypoints", async () => {
  await using t = await setupTest();
  await t.prismaInit("mysql", "mysql://root:password@localhost:3306/test");

  await Bun.write(
    t.tempPath("prisma/schema.prisma"),
    `datasource db {
      provider = "mysql"
  }

  generator kysely {
      provider  = "node ${GENERATOR_PATH}"
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
  // await t.prisma("db", "push"); // can't push to mysql, enums not supported in sqlite
  await t.prisma("generate"); //   so just generate

  const typeFile = await Bun.file(
    t.tempPath("prisma/generated/types.ts")
  ).text();
  expect(typeFile).not.toContain("export const");
  expect(typeFile).toContain(`import type { TestEnum } from "./enums";`);

  const enumFile = await Bun.file(
    t.tempPath("prisma/generated/enums.ts")
  ).text();
  expect(enumFile).toEqual(`export const TestEnum = {
    A: "A",
    B: "B",
    C: "C"
} as const;
export type TestEnum = (typeof TestEnum)[keyof typeof TestEnum];
`);
});

test("End to end test - separate entrypoints but no enums", async () => {
  await using t = await setupTest();
  await t.prismaInit("sqlite", "file:./dev.db");

  await Bun.write(
    t.tempPath("prisma/schema.prisma"),
    `datasource db {
      provider = "sqlite"
  }

  generator kysely {
      provider  = "node ${GENERATOR_PATH}"
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

  await t.prisma("db", "push");
  await t.prisma("generate");

  // Shouldn't have an empty import statement
  const typeFile = await Bun.file(
    t.tempPath("prisma/generated/types.ts")
  ).text();
  expect(typeFile).not.toContain('from "./enums"');

  // Shouldn't have generated an empty file
  expect(await Bun.file(t.tempPath("prisma/generated/enums.ts")).exists()).toBe(
    false
  );
});

test("End to end test - multi-schema support", async () => {
  await using t = await setupTest();
  await t.prismaInit("postgresql", "postgresql://localhost:5432/test");

  await Bun.write(
    t.tempPath("prisma/schema.prisma"),
    `generator kysely {
      provider  = "node ${GENERATOR_PATH}"
      previewFeatures = ["multiSchema"]
  }

  datasource db {
      provider = "postgresql"
      schemas  = ["mammals", "birds"]
  }

  model Elephant {
      id   Int    @id
      name String

      @@map("elephants")
      @@schema("mammals")
  }

  model Eagle {
      id   Int    @id
      name String

      @@map("eagles")
      @@schema("birds")
  }`
  );

  await t.prisma("generate");

  const typeFile = await Bun.file(
    t.tempPath("prisma/generated/types.ts")
  ).text();

  expect(typeFile).toContain(`export type DB = {
    "birds.eagles": Eagle;
    "mammals.elephants": Elephant;
};`);
});

test("End to end test - multi-schema and filterBySchema support", async () => {
  await using t = await setupTest();
  await t.prismaInit("postgresql", "postgresql://localhost:5432/test");

  await Bun.write(
    t.tempPath("prisma/schema.prisma"),
    `generator kysely {
      provider  = "node ${GENERATOR_PATH}"
      previewFeatures = ["multiSchema"]
      filterBySchema = ["mammals"]
  }

  datasource db {
      provider = "postgresql"
      schemas  = ["mammals", "birds"]
  }

  model Elephant {
      id   Int    @id
      name String

      @@map("elephants")
      @@schema("mammals")
  }

  model Eagle {
      id   Int    @id
      name String

      @@map("eagles")
      @@schema("birds")
  }`
  );

  await t.prisma("generate");

  const typeFile = await Bun.file(
    t.tempPath("prisma/generated/types.ts")
  ).text();

  expect(typeFile).toContain(`export type DB = {
    "mammals.elephants": Elephant;
};`);
});

test("End to end test - multi-schema and groupBySchema support", async () => {
  await using t = await setupTest();
  await t.prismaInit("postgresql", "postgresql://localhost:5432/test");

  await Bun.write(
    t.tempPath("prisma/schema.prisma"),
    `
generator kysely {
  provider        = "node ${GENERATOR_PATH}"
  previewFeatures = ["multiSchema"]
  groupBySchema   = true
}

datasource db {
  provider = "postgresql"
  schemas  = ["mammals", "birds", "world"]
}

model Elephant {
  id      Int     @id
  name    String
  ability Ability @default(WALK)
  color  Color

  @@map("elephants")
  @@schema("mammals")
}

model Eagle {
  id      Int     @id
  name    String
  ability Ability @default(FLY)

  @@map("eagles")
  @@schema("birds")
}

enum Ability {
  FLY
  WALK

  @@schema("world")
}

enum Color {
  GRAY
  PINK

  @@schema("mammals")
}
    `
  );

  await t.prisma("generate");

  const typeFile = await Bun.file(
    t.tempPath("prisma/generated/types.ts")
  ).text();

  expect(typeFile).toContain(`export namespace Birds {
    export type Eagle = {`);

  expect(typeFile).toContain(`export namespace Mammals {
    export const Color = {`);

  // correctly references the color enum
  expect(typeFile).toContain("color: Mammals.Color;");

  expect(typeFile).toContain(`export type DB = {
    "birds.eagles": Birds.Eagle;
    "mammals.elephants": Mammals.Elephant;
};`);
});

test("End to end test - multi-schema, groupBySchema and defaultSchema support", async () => {
  await using t = await setupTest();
  await t.prismaInit("postgresql", "postgresql://localhost:5432/test");

  await Bun.write(
    t.tempPath("prisma/schema.prisma"),
    `
generator kysely {
  provider        = "node ${GENERATOR_PATH}"
  previewFeatures = ["multiSchema"]
  groupBySchema   = true
  defaultSchema   = "fish"
}

datasource db {
  provider = "postgresql"
  schemas  = ["mammals", "birds", "world", "fish"]
}

model Elephant {
  id      Int     @id
  name    String
  ability Ability @default(WALK)
  color  Color

  @@map("elephants")
  @@schema("mammals")
}

model Eagle {
  id      Int     @id
  name    String
  ability Ability @default(FLY)

  @@map("eagles")
  @@schema("birds")
}

model Shark {
  id      Int     @id
  name    String
  color  Color

  @@map("shark")
  @@schema("fish")
}

enum Ability {
  FLY
  WALK

  @@schema("world")
}

enum Color {
  GRAY
  PINK

  @@schema("mammals")
}
    `
  );

  await t.prisma("generate");

  const typeFile = await Bun.file(
    t.tempPath("prisma/generated/types.ts")
  ).text();

  expect(typeFile).toContain(`export namespace Birds {
    export type Eagle = {`);

  expect(typeFile).toContain(`export namespace Mammals {
    export const Color = {`);

  // outside of enum
  expect(typeFile).toContain("export type Shark = {");

  // correctly references the color enum
  expect(typeFile).toContain("color: Mammals.Color;");

  expect(typeFile).toContain(`export type DB = {
    "birds.eagles": Birds.Eagle;
    "mammals.elephants": Mammals.Elephant;
    shark: Shark;
};`);
});

test("End to end test - multi-schema, groupBySchema and filterBySchema support", async () => {
  await using t = await setupTest();
  await t.prismaInit("postgresql", "postgresql://localhost:5432/test");

  await Bun.write(
    t.tempPath("prisma/schema.prisma"),
    `
generator kysely {
  provider        = "node ${GENERATOR_PATH}"
  previewFeatures = ["multiSchema"]
  groupBySchema   = true
  filterBySchema = ["mammals", "world"]
}

datasource db {
  provider = "postgresql"
  schemas  = ["mammals", "birds", "world"]
}

model Elephant {
  id      Int     @id
  name    String
  ability Ability @default(WALK)
  color  Color

  @@map("elephants")
  @@schema("mammals")
}

model Eagle {
  id      Int     @id
  name    String
  ability Ability @default(FLY)

  @@map("eagles")
  @@schema("birds")
}

enum Ability {
  FLY
  WALK

  @@schema("world")
}

enum Color {
  GRAY
  PINK

  @@schema("mammals")
}
    `
  );

  await t.prisma("generate");

  const typeFile = await Bun.file(
    t.tempPath("prisma/generated/types.ts")
  ).text();

  expect(typeFile).not.toContain(`export namespace Birds {
    export type Eagle = {`);

  expect(typeFile).toContain(`export namespace Mammals {
    export const Color = {`);

  // correctly references the color enum
  expect(typeFile).toContain("color: Mammals.Color;");

  expect(typeFile).toContain(`export type DB = {
    "mammals.elephants": Mammals.Elephant;
};`);
});

test("End to end test - SQLite with JSON support", async () => {
  await using t = await setupTest();
  await t.prismaInit("sqlite", "file:./dev.db");

  await Bun.write(
    t.tempPath("prisma/schema.prisma"),
    `datasource db {
      provider = "sqlite"
  }

  generator kysely {
      provider  = "node ${GENERATOR_PATH}"
  }

  model TestUser {
      id          String   @id
      name        String
      metadata    Json     // JSON field supported in SQLite since Prisma 6.2
      preferences Json?    // Optional JSON field

      /// @kyselyType({ theme: 'light' | 'dark', language: string })
      settings    Json

      createdAt   DateTime @default(now())
  }

  model Product {
      id          Int      @id @default(autoincrement())
      name        String
      details     Json     // Product details as JSON

      /// @kyselyType(string[])
      tags        Json?    // Optional tags as JSON array
  }`
  );

  await t.prisma("generate");

  const generatedSource = await Bun.file(
    t.tempPath("prisma/generated/types.ts")
  ).text();

  expect(generatedSource).toContain(`export type TestUser = {
    id: string;
    name: string;
    metadata: unknown;
    preferences: unknown | null;
    /**
     * @kyselyType({ theme: 'light' | 'dark', language: string })
     */
    settings: { theme: 'light' | 'dark', language: string };
    createdAt: Generated<string>;
};`);

  expect(generatedSource).toContain(`export type Product = {
    id: Generated<number>;
    name: string;
    details: unknown;
    /**
     * @kyselyType(string[])
     */
    tags: string[] | null;
};`);

  expect(generatedSource).toContain(`export type DB = {
    Product: Product;
    TestUser: TestUser;
};`);
});

test("End to end test - multi-schema with views support", async () => {
  await using t = await setupTest();
  await t.prismaInit("postgresql", "postgresql://localhost:5432/test");

  await Bun.write(
    t.tempPath("prisma/schema.prisma"),
    `generator kysely {
      provider        = "node ${GENERATOR_PATH}"
      previewFeatures = ["multiSchema", "views"]
  }

  datasource db {
      provider = "postgresql"
      schemas  = ["public", "analytics"]
  }

  model User {
      id      Int    @id
      name    String
      email   String
      posts   Post[]

      @@schema("public")
  }

  model Post {
      id       Int    @id
      title    String
      content  String
      authorId Int
      author   User   @relation(fields: [authorId], references: [id])

      @@schema("public")
  }

  view UserStats {
      id        Int    @unique
      name      String
      postCount Int

      @@schema("analytics")
  }

  view PostSummary {
      id      Int    @unique
      title   String
      author  String

      @@schema("public")
  }`
  );

  await t.prisma("generate");

  const typeFile = await Bun.file(
    t.tempPath("prisma/generated/types.ts")
  ).text();

  // Verify that views are properly prefixed with their schema names
  expect(typeFile).toContain(`export type DB = {
    "analytics.UserStats": UserStats;
    Post: Post;
    PostSummary: PostSummary;
    User: User;
};`);

  // Verify view types are generated correctly
  expect(typeFile).toContain(`export type UserStats = {
    id: number;
    name: string;
    postCount: number;
};`);

  expect(typeFile).toContain(`export type PostSummary = {
    id: number;
    title: string;
    author: string;
};`);
});

test("End to end test - exportWrappedTypes", async () => {
  await using t = await setupTest();
  await t.prismaInit("sqlite", "file:./dev.db");

  await Bun.write(
    t.tempPath("prisma/schema.prisma"),
    `datasource db {
        provider = "sqlite"
      }

    generator kysely {
        provider           = "node ${GENERATOR_PATH}"
        exportWrappedTypes = true
    }

    model User {
        id   String @id
        name String
    }`
  );

  await t.prisma("generate");

  const generatedSource = await Bun.file(
    t.tempPath("prisma/generated/types.ts")
  ).text();

  expect(generatedSource).toContain("export type UserTable = {");
  expect(generatedSource).toContain(
    "export type User = Selectable<UserTable>;"
  );
  expect(generatedSource).toContain(
    "export type NewUser = Insertable<UserTable>;"
  );
  expect(generatedSource).toContain(
    "export type UserUpdate = Updateable<UserTable>;"
  );
  expect(generatedSource).toContain(
    "export type DB = {\n    User: UserTable;\n};"
  );
});

test("End to end test - groupBySchema and exportWrappedTypes support", async () => {
  await using t = await setupTest();
  await t.prismaInit("postgresql", "postgresql://localhost:5432/test");

  await Bun.write(
    t.tempPath("prisma/schema.prisma"),
    `
generator kysely {
  provider             = "node ${GENERATOR_PATH}"
  previewFeatures      = ["multiSchema"]
  groupBySchema        = true
  exportWrappedTypes   = true
}

datasource db {
  provider = "postgresql"
  schemas  = ["mammals", "birds", "world"]
}

model Elephant {
  id      Int     @id
  name    String
  ability Ability @default(WALK)
  color  Color

  @@map("elephants")
  @@schema("mammals")
}

model Eagle {
  id      Int     @id
  name    String
  ability Ability @default(FLY)

  @@map("eagles")
  @@schema("birds")
}

enum Ability {
  FLY
  WALK

  @@schema("world")
}

enum Color {
  GRAY
  PINK

  @@schema("mammals")
}
    `
  );

  await t.prisma("generate");

  const typeFile = await Bun.file(
    t.tempPath("prisma/generated/types.ts")
  ).text();

  expect(typeFile).toContain(`export namespace Birds {
    export type EagleTable = {`);

  expect(typeFile).toContain(`export namespace Mammals {
    export const Color = {`);

  // correctly references the color enum
  expect(typeFile).toContain("color: Mammals.Color;");

  expect(typeFile).toContain(`export type DB = {
    "birds.eagles": Birds.EagleTable;
    "mammals.elephants": Mammals.ElephantTable;
};`);
});
