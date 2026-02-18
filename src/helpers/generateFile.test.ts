import { expect, test } from "bun:test";

import { generateFile } from "./generateFile.ts";

test("generates a file!", () => {
  const resultwithLeader = generateFile([], {
    withEnumImport: false,
    withLeader: true,
    exportWrappedTypes: false,
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
  });
  expect(resultwithLeader).toContain(
    ', Insertable, Selectable, Updateable } from "kysely";'
  );
});

test("generates a file with custom prefix when banner is specified.", () => {
  const result = generateFile([], {
    withEnumImport: false,
    withLeader: true,
    exportWrappedTypes: false,
    banner: "import Decimal from 'decimal.js';",
  });
  expect(result).toContain("import Decimal from 'decimal.js';");
});

test("generates a file with multiple imports in banner.", () => {
  const result = generateFile([], {
    withEnumImport: false,
    withLeader: true,
    exportWrappedTypes: false,
    banner: `import Decimal from 'decimal.js';
import { Big } from 'big.js';
import * as moment from 'moment';`,
  });
  expect(result).toContain("import Decimal from 'decimal.js';");
  expect(result).toContain("import { Big } from 'big.js';");
  expect(result).toContain("import * as moment from 'moment';");
});

test("generates a file with banner containing renamed imports.", () => {
  const result = generateFile([], {
    withEnumImport: false,
    withLeader: true,
    exportWrappedTypes: false,
    banner: "import { v4 as uuid } from 'uuid';",
  });
  expect(result).toContain("import { v4 as uuid } from 'uuid';");
});
