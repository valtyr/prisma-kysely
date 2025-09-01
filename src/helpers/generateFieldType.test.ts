import { expect, test } from "vitest";

import { generateFieldType } from "~/helpers/generateFieldType";

test("it respects overrides when generating field types", () => {
  const overrides = {
    stringTypeOverride: "stringOverride",
    bigIntTypeOverride: "smallInt",
    booleanTypeOverride: "bootilt",
    bytesTypeOverride: "bits",
    dateTimeTypeOverride: "aloneTime",
    decimalTypeOverride: "octal",
    floatTypeOverride: "sink",
    intTypeOverride: "lol",
    jsonTypeOverride: "freddy",
    unsupportedTypeOverride: "valid",
  };

  const config = {
    ...overrides,
    databaseProvider: "postgresql" as const,
    fileName: "types.ts",
    enumFileName: "types.ts",
    camelCase: false,
    readOnlyIds: false,
    groupBySchema: false,
    defaultSchema: "public",
    dbTypeName: "DB",
    importExtension: "",
  };

  const sourceTypes = [
    "String",
    "BigInt",
    "Boolean",
    "Bytes",
    "DateTime",
    "Decimal",
    "Float",
    "Int",
    "Json",
    "Unsupported",
  ];

  expect(
    sourceTypes.map((source) => generateFieldType(source, config))
  ).toEqual(Object.values(overrides));
});

test("it respects overrides when generating field types", () => {
  const node = generateFieldType("String", {
    databaseProvider: "mysql",
    fileName: "types.ts",
    enumFileName: "types.ts",
    stringTypeOverride: "cheese",
    camelCase: false,
    readOnlyIds: false,
    groupBySchema: false,
    defaultSchema: "public",
    dbTypeName: "DB",
    importExtension: "",
  });

  expect(node).toEqual("cheese");
});

test("it respects differences between database engines", () => {
  const postgresBooleanType = generateFieldType("Boolean", {
    databaseProvider: "postgresql",
    fileName: "types.ts",
    enumFileName: "types.ts",
    camelCase: false,
    readOnlyIds: false,
    groupBySchema: false,
    defaultSchema: "public",
    dbTypeName: "DB",
    importExtension: "",
  });

  const mysqlBooleanType = generateFieldType("Boolean", {
    databaseProvider: "mysql",
    fileName: "types.ts",
    enumFileName: "types.ts",
    camelCase: false,
    readOnlyIds: false,
    groupBySchema: false,
    defaultSchema: "public",
    dbTypeName: "DB",
    importExtension: "",
  });

  const sqliteBooleanType = generateFieldType("Boolean", {
    databaseProvider: "sqlite",
    fileName: "types.ts",
    enumFileName: "types.ts",
    camelCase: false,
    readOnlyIds: false,
    groupBySchema: false,
    defaultSchema: "public",
    dbTypeName: "DB",
    importExtension: "",
  });

  expect(postgresBooleanType).toEqual("boolean");
  expect(mysqlBooleanType).toEqual("number");
  expect(sqliteBooleanType).toEqual("number");
});

test("it supports JSON type in SQLite", () => {
  const sqliteJsonType = generateFieldType("Json", {
    databaseProvider: "sqlite",
    fileName: "types.ts",
    enumFileName: "types.ts",
    camelCase: false,
    readOnlyIds: false,
    groupBySchema: false,
    defaultSchema: "public",
    dbTypeName: "DB",
    importExtension: "",
  });

  expect(sqliteJsonType).toEqual("unknown");
});
