import { exec as execCb } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, expect, test } from "vitest";

const execAsync = promisify(execCb);

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const GENERATOR_PATH = path.join(PROJECT_ROOT, "dist/bin.js");
const PRISMA_PATH = path.join(PROJECT_ROOT, "node_modules/.bin/prisma");

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "prisma-kysely-test-"));
});

afterEach(async () => {
  if (tempDir) {
    await fs.rm(tempDir, { force: true, recursive: true }).catch(() => {});
  }
});

const exec = (command: string) => execAsync(command, { cwd: tempDir });

const prisma = (args: string) => exec(`${PRISMA_PATH} ${args}`);

const prismaInit = async (datasourceProvider: string) => {
  await prisma(`init --datasource-provider ${datasourceProvider}`);
  await fs.rm(tempPath("prisma.config.ts")).catch(() => {});
};

const tempPath = (...parts: string[]) => path.join(tempDir, ...parts);

test("End to end test", { timeout: 20000 }, async () => {
  // Initialize prisma:
  await prismaInit("sqlite");

  // Set up a schema
  await fs.writeFile(
    tempPath("prisma/schema.prisma"),
    `datasource db {
        provider = "sqlite"
        url      = "file:./dev.db"
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

  // Run Prisma commands without fail
  await prisma("generate");

  const generatedSource = await fs.readFile(
    tempPath("prisma/generated/types.ts"),
    { encoding: "utf-8" }
  );

  expect(generatedSource).toContain(`export type SprocketToTestUser = {
    A: number;
    B: string;
};`);

  expect(generatedSource).toContain("_SprocketToTestUser: SprocketToTestUser");

  // Expect no Kysely wrapped types to be exported since we don't enable exportWrappedTypes
  expect(generatedSource).not.toContain("Insertable");
});

test(
  "End to end test - with custom type override",
  { timeout: 20000 },
  async () => {
    // Initialize prisma:
    await prismaInit("sqlite");

    // Set up a schema
    await fs.writeFile(
      tempPath("prisma/schema.prisma"),
      `datasource db {
        provider = "sqlite"
        url      = "file:./dev.db"
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

    // Run Prisma commands without fail
    await prisma("generate");

    const generatedSource = await fs.readFile(
      tempPath("prisma/generated/types.ts"),
      { encoding: "utf-8" }
    );

    // Expect many to many models to have been generated
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
  }
);

test("End to end test - separate entrypoints", { timeout: 20000 }, async () => {
  // Initialize prisma:
  await prismaInit("mysql");

  // Set up a schema
  await fs.writeFile(
    tempPath("prisma/schema.prisma"),
    `datasource db {
        provider = "mysql"
        url      = "mysql://root:password@localhost:3306/test"
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
  // await prisma("db push"); // can't push to mysql, enums not supported in sqlite
  await prisma("generate"); //   so just generate

  const typeFile = await fs.readFile(tempPath("prisma/generated/types.ts"), {
    encoding: "utf-8",
  });
  expect(typeFile).not.toContain("export const");
  expect(typeFile).toContain(`import type { TestEnum } from "./enums";`);

  const enumFile = await fs.readFile(tempPath("prisma/generated/enums.ts"), {
    encoding: "utf-8",
  });
  expect(enumFile).toEqual(`export const TestEnum = {
    A: "A",
    B: "B",
    C: "C"
} as const;
export type TestEnum = (typeof TestEnum)[keyof typeof TestEnum];
`);
});

test(
  "End to end test - separate entrypoints but no enums",
  { timeout: 20000 },
  async () => {
    // Initialize prisma:
    await prismaInit("sqlite");

    // Set up a schema
    await fs.writeFile(
      tempPath("prisma/schema.prisma"),
      `datasource db {
        provider = "sqlite"
        url      = "file:./dev.db"
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

    // Run Prisma commands without fail
    await prisma("db push");
    await prisma("generate");

    // Shouldn't have an empty import statement
    const typeFile = await fs.readFile(tempPath("prisma/generated/types.ts"), {
      encoding: "utf-8",
    });
    expect(typeFile).not.toContain('from "./enums"');

    // Shouldn't have generated an empty file
    await expect(
      fs.readFile(tempPath("prisma/generated/enums.ts"), {
        encoding: "utf-8",
      })
    ).rejects.toThrow();
  }
);

test("End to end test - multi-schema support", { timeout: 20000 }, async () => {
  // Initialize prisma:
  await prismaInit("postgresql");

  // Set up a schema
  await fs.writeFile(
    tempPath("prisma/schema.prisma"),
    `generator kysely {
        provider  = "node ${GENERATOR_PATH}"
        previewFeatures = ["multiSchema"]
    }

    datasource db {
        provider = "postgresql"
        schemas  = ["mammals", "birds"]
        url      = env("TEST_DATABASE_URL")
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

  await prisma("generate");

  // Shouldn't have an empty import statement
  const typeFile = await fs.readFile(tempPath("prisma/generated/types.ts"), {
    encoding: "utf-8",
  });

  expect(typeFile).toContain(`export type DB = {
    "birds.eagles": Eagle;
    "mammals.elephants": Elephant;
};`);
});

test(
  "End to end test - multi-schema and filterBySchema support",
  { timeout: 20000 },
  async () => {
    // Initialize prisma:
    await prismaInit("postgresql");

    // Set up a schema
    await fs.writeFile(
      tempPath("prisma/schema.prisma"),
      `generator kysely {
        provider  = "node ${GENERATOR_PATH}"
        previewFeatures = ["multiSchema"]
        filterBySchema = ["mammals"]
    }

    datasource db {
        provider = "postgresql"
        schemas  = ["mammals", "birds"]
        url      = env("TEST_DATABASE_URL")
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

    await prisma("generate");

    // Shouldn't have an empty import statement
    const typeFile = await fs.readFile(tempPath("prisma/generated/types.ts"), {
      encoding: "utf-8",
    });

    expect(typeFile).toContain(`export type DB = {
    "mammals.elephants": Elephant;
};`);
  }
);

test(
  "End to end test - multi-schema and groupBySchema support",
  { timeout: 20000 },
  async () => {
    // Initialize prisma:
    await prismaInit("postgresql");

    // Set up a schema
    await fs.writeFile(
      tempPath("prisma/schema.prisma"),
      `
generator kysely {
    provider        = "node ${GENERATOR_PATH}"
    previewFeatures = ["multiSchema"]
    groupBySchema   = true
}

datasource db {
    provider = "postgresql"
    schemas  = ["mammals", "birds", "world"]
    url      = env("TEST_DATABASE_URL")
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

    await prisma("generate");

    // Shouldn't have an empty import statement
    const typeFile = await fs.readFile(tempPath("prisma/generated/types.ts"), {
      encoding: "utf-8",
    });

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
  }
);

test(
  "End to end test - multi-schema, groupBySchema and defaultSchema support",
  { timeout: 20000 },
  async () => {
    // Initialize prisma:
    await prismaInit("postgresql");

    // Set up a schema
    await fs.writeFile(
      tempPath("prisma/schema.prisma"),
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
    url      = env("TEST_DATABASE_URL")
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

    await prisma("generate");

    // Shouldn't have an empty import statement
    const typeFile = await fs.readFile(tempPath("prisma/generated/types.ts"), {
      encoding: "utf-8",
    });

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
  }
);

test(
  "End to end test - multi-schema, groupBySchema and filterBySchema support",
  { timeout: 20000 },
  async () => {
    // Initialize prisma:
    await prismaInit("postgresql");

    // Set up a schema
    await fs.writeFile(
      tempPath("prisma/schema.prisma"),
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
    url      = env("TEST_DATABASE_URL")
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

    await prisma("generate");

    // Shouldn't have an empty import statement
    const typeFile = await fs.readFile(tempPath("prisma/generated/types.ts"), {
      encoding: "utf-8",
    });

    expect(typeFile).not.toContain(`export namespace Birds {
    export type Eagle = {`);

    expect(typeFile).toContain(`export namespace Mammals {
    export const Color = {`);

    // correctly references the color enum
    expect(typeFile).toContain("color: Mammals.Color;");

    expect(typeFile).toContain(`export type DB = {
    "mammals.elephants": Mammals.Elephant;
};`);
  }
);

test(
  "End to end test - SQLite with JSON support",
  { timeout: 20000 },
  async () => {
    await prismaInit("sqlite");

    await fs.writeFile(
      tempPath("prisma/schema.prisma"),
      `datasource db {
        provider = "sqlite"
        url      = "file:./dev.db"
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

    await prisma("generate");

    const generatedSource = await fs.readFile(
      tempPath("prisma/generated/types.ts"),
      { encoding: "utf-8" }
    );

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
  }
);

test(
  "End to end test - multi-schema with views support",
  { timeout: 20000 },
  async () => {
    // Initialize prisma:
    await prismaInit("postgresql");

    // Set up a schema with views in different schemas
    await fs.writeFile(
      tempPath("prisma/schema.prisma"),
      `generator kysely {
        provider        = "node ${GENERATOR_PATH}"
        previewFeatures = ["multiSchema", "views"]
    }

    datasource db {
        provider = "postgresql"
        schemas  = ["public", "analytics"]
        url      = env("TEST_DATABASE_URL")
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

    await prisma("generate");

    const typeFile = await fs.readFile(tempPath("prisma/generated/types.ts"), {
      encoding: "utf-8",
    });

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
  }
);

test("End to end test - exportWrappedTypes", { timeout: 20000 }, async () => {
  await prismaInit("sqlite");

  await fs.writeFile(
    tempPath("prisma/schema.prisma"),
    `datasource db {
          provider = "sqlite"
          url      = "file:./dev.db"
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

  await prisma("generate");

  const generatedSource = await fs.readFile(
    tempPath("prisma/generated/types.ts"),
    { encoding: "utf-8" }
  );

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

test(
  "End to end test - groupBySchema and exportWrappedTypes support",
  { timeout: 20000 },
  async () => {
    // Initialize prisma:
    await prismaInit("postgresql");

    // Set up a schema
    await fs.writeFile(
      tempPath("prisma/schema.prisma"),
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
    url      = env("TEST_DATABASE_URL")
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

    await prisma("generate");

    // Shouldn't have an empty import statement
    const typeFile = await fs.readFile(tempPath("prisma/generated/types.ts"), {
      encoding: "utf-8",
    });

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
  }
);
