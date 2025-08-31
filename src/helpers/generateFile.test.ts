import { expect, test } from "vitest";

import { generateFile } from "~/helpers/generateFile";

test("generates a file!", () => {
  const resultwithLeader = generateFile([], {
    withEnumImport: false,
    withLeader: true,
  });
  expect(resultwithLeader).toContain('from "kysely";');

  const resultwithEnumImport = generateFile([], {
    withEnumImport: { importPath: "./enums", names: ["Foo", "Bar"] },
    withLeader: false,
  });

  expect(resultwithEnumImport).toContain(
    'import type { Foo, Bar } from "./enums";'
  );
  expect(resultwithEnumImport).not.toContain('from "kysely";');
});
