import { exec as execCb } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";
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

test("End to end test", { timeout: 20000 }, async () => {
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
        id          Int @id
        users       TestUser[]
    }`
  );

  // Run Prisma commands without fail
  await exec("yarn prisma generate");

  const generatedSource = await fs.readFile("./prisma/generated/types.ts", {
    encoding: "utf-8",
  });

  // Expect many to many models to have been generated
  expect(
    generatedSource.includes(`export type SprocketToTestUser = {
  A: number;
  B: string;
};`)
  ).toBeTruthy();
  expect(
    generatedSource.includes("_SprocketToTestUser: SprocketToTestUser")
  ).toBeTruthy();
});

test(
  "End to end test - with custom type override",
  { timeout: 20000 },
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

        /// @kyselyType('member' | 'owner')
        role        String
    }`
    );

    // Run Prisma commands without fail
    await exec("yarn prisma generate");

    const generatedSource = await fs.readFile("./prisma/generated/types.ts", {
      encoding: "utf-8",
    });

    // Expect many to many models to have been generated
    expect(
      generatedSource.includes(`export type TestUser = {
  id: string;
  name: string;
  /**
   * @kyselyType('member' | 'owner')
   */
  role: "member" | "owner";
};`)
    ).toBeTruthy();
  }
);

test("End to end test - separate entrypoints", { timeout: 20000 }, async () => {
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
  expect(enumFile).toEqual(`export const TestEnum = {
  A: "A",
  B: "B",
  C: "C",
} as const;
export type TestEnum = (typeof TestEnum)[keyof typeof TestEnum];
`);
});

test(
  "End to end test - separate entrypoints but no enums",
  { timeout: 20000 },
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
    await expect(
      fs.readFile("./prisma/generated/enums.ts", {
        encoding: "utf-8",
      })
    ).rejects.toThrow();
  }
);

test("End to end test - multi-schema support", { timeout: 20000 }, async () => {
  // Initialize prisma:
  await exec("yarn prisma init --datasource-provider postgresql");

  // Set up a schema
  await fs.writeFile(
    "./prisma/schema.prisma",
    `generator kysely {
        provider  = "node ./dist/bin.js"
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

  await exec("yarn prisma generate");

  // Shouldn't have an empty import statement
  const typeFile = await fs.readFile("./prisma/generated/types.ts", {
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
    await exec("yarn prisma init --datasource-provider postgresql");

    // Set up a schema
    await fs.writeFile(
      "./prisma/schema.prisma",
      `generator kysely {
        provider  = "node ./dist/bin.js"
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

    await exec("yarn prisma generate");

    // Shouldn't have an empty import statement
    const typeFile = await fs.readFile("./prisma/generated/types.ts", {
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
    await exec("yarn prisma init --datasource-provider postgresql");

    // Set up a schema
    await fs.writeFile(
      "./prisma/schema.prisma",
      `
generator kysely {
    provider        = "node ./dist/bin.js"
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

    await exec("yarn prisma generate");

    // Shouldn't have an empty import statement
    const typeFile = await fs.readFile("./prisma/generated/types.ts", {
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
    await exec("yarn prisma init --datasource-provider postgresql");

    // Set up a schema
    await fs.writeFile(
      "./prisma/schema.prisma",
      `
generator kysely {
    provider        = "node ./dist/bin.js"
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

    await exec("yarn prisma generate");

    // Shouldn't have an empty import statement
    const typeFile = await fs.readFile("./prisma/generated/types.ts", {
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
  "fish.shark": Shark;
  "mammals.elephants": Mammals.Elephant;
};`);
  }
);

test(
  "End to end test - multi-schema, groupBySchema and filterBySchema support",
  { timeout: 20000 },
  async () => {
    // Initialize prisma:
    await exec("yarn prisma init --datasource-provider postgresql");

    // Set up a schema
    await fs.writeFile(
      "./prisma/schema.prisma",
      `
generator kysely {
    provider        = "node ./dist/bin.js"
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

    await exec("yarn prisma generate");

    // Shouldn't have an empty import statement
    const typeFile = await fs.readFile("./prisma/generated/types.ts", {
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
