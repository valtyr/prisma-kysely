import { expect, test } from "vitest";

import { generateFile } from "~/helpers/generateFile";

test("generates a file!", () => {
  const resultwithLeader = generateFile([], {
    withEnumImport: false,
    withLeader: true,
    exportWrappedTypes: false,
    tsNoCheck: false,
  });
  expect(resultwithLeader).toContain('from "kysely";');
  // assert that unnecessary types are not imported
  expect(resultwithLeader).not.toContain(
    ', Insertable, Selectable, Updateable } from "kysely";'
  );

  const resultwithEnumImport = generateFile([], {
    withEnumImport: { importPath: "./enums", names: ["Foo", "Bar"] },
    withLeader: false,
    exportWrappedTypes: false,
    tsNoCheck: false,
  });

  expect(resultwithEnumImport).toContain(
    'import type { Foo, Bar } from "./enums";'
  );
  expect(resultwithEnumImport).not.toContain('from "kysely";');
});

test("generates a file which imports Kysely wrapper types.", () => {
  const resultwithLeader = generateFile([], {
    withEnumImport: false,
    withLeader: true,
    exportWrappedTypes: true,
    tsNoCheck: false,
  });
  expect(resultwithLeader).toContain(
    ', Insertable, Selectable, Updateable } from "kysely";'
  );
});

test("generates a file which begins with noCheck", () => {
  const resultwithLeaderWithCheck = generateFile([], {
    withEnumImport: false,
    withLeader: true,
    exportWrappedTypes: true,
    tsNoCheck: false,
  });
  const resultwithLeaderWithoutCheck = generateFile([], {
    withEnumImport: false,
    withLeader: true,
    exportWrappedTypes: true,
    tsNoCheck: true,
  });
  const noCheckRegex = /^\/\/ @ts-nocheck\n/g;
  expect(resultwithLeaderWithCheck).not.toMatch(noCheckRegex);
  expect(resultwithLeaderWithoutCheck).toMatch(noCheckRegex);
});
