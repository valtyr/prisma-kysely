import { expect, test } from "bun:test";
import ts from "typescript";

import { generateFiles } from "./generateFiles.ts";
import type { EnumType } from "./generateEnumType.ts";
import type { ModelType } from "./generateModel.ts";

/**
 * Creates a minimal exported type alias for testing file-level composition.
 */
function createType(name: string, properties: ts.TypeElement[] = []) {
  return ts.factory.createTypeAliasDeclaration(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier(name),
    undefined,
    ts.factory.createTypeLiteralNode(properties)
  );
}

/**
 * Creates a minimal enum-like pair matching generated enum output shape.
 */
function createEnum(name: string, schema?: string): EnumType {
  return {
    typeName: name,
    schema,
    objectDeclaration: ts.factory.createVariableStatement(
      [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      ts.factory.createVariableDeclarationList(
        [
          ts.factory.createVariableDeclaration(
            name,
            undefined,
            undefined,
            ts.factory.createAsExpression(
              ts.factory.createObjectLiteralExpression([], false),
              ts.factory.createTypeReferenceNode("const", undefined)
            )
          ),
        ],
        ts.NodeFlags.Const
      )
    ),
    typeDeclaration: ts.factory.createTypeAliasDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      ts.factory.createIdentifier(name),
      undefined,
      ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
    ),
  };
}

/**
 * Creates a generated model descriptor with only the metadata generateFiles needs.
 */
function createModel(model: Partial<ModelType> & Pick<ModelType, "typeName">) {
  return {
    tableName: model.typeName,
    definition: createType(model.typeName),
    referencedSchemas: [],
    referencedSchemaTypes: [],
    ...model,
  } satisfies ModelType;
}

test("generates schema export files for schemaGrouping exports", () => {
  const databaseType = createType("DB", [
    ts.factory.createPropertySignature(
      undefined,
      ts.factory.createStringLiteral("mammals.elephants"),
      undefined,
      ts.factory.createTypeReferenceNode("Mammals.Elephant", undefined)
    ),
  ]);

  const files = generateFiles({
    typesOutfile: "types.ts",
    enums: [
      createEnum("Mood"),
      createEnum("Color", "mammals"),
      createEnum("Ability", "world"),
    ],
    models: [
      createModel({
        typeName: "Fish",
      }),
      createModel({
        typeName: "Elephant",
        schema: "mammals",
        definition: createType("Elephant", [
          ts.factory.createPropertySignature(
            undefined,
            ts.factory.createIdentifier("color"),
            undefined,
            ts.factory.createTypeReferenceNode("Color", undefined)
          ),
          ts.factory.createPropertySignature(
            undefined,
            ts.factory.createIdentifier("ability"),
            undefined,
            ts.factory.createTypeReferenceNode("World.Ability", undefined)
          ),
          ts.factory.createPropertySignature(
            undefined,
            ts.factory.createIdentifier("mood"),
            undefined,
            ts.factory.createTypeReferenceNode("Mood", undefined)
          ),
        ]),
        referencedSchemaTypes: [
          { schema: "mammals", typeName: "Color" },
          { schema: "world", typeName: "Ability" },
          { schema: "public", typeName: "Mood" },
        ],
      }),
    ],
    enumNames: ["Mood", "Color", "Ability"],
    enumsOutfile: "enums.ts",
    databaseType,
    schemaGrouping: "exports",
    defaultSchema: "public",
    importExtension: ".ts",
    exportWrappedTypes: false,
  });

  expect(files.map((file) => file.filepath)).toEqual([
    "types/index.ts",
    "types/mammals.ts",
    "types/world.ts",
  ]);

  const indexFile = files.find(
    (file) => file.filepath === "types/index.ts"
  )?.content;
  const mammalsFile = files.find(
    (file) => file.filepath === "types/mammals.ts"
  )?.content;

  expect(indexFile).toContain('import type * as Mammals from "./mammals.ts";');
  expect(indexFile).toContain('export * as Mammals from "./mammals.ts";');
  expect(indexFile).not.toContain("export type { GeneratedAlways");
  expect(indexFile).toContain('import type * as World from "./world.ts";');
  expect(indexFile).toContain('export * as World from "./world.ts";');
  expect(indexFile).toContain(
    'export type DB = {\n    "mammals.elephants": Mammals.Elephant;\n};'
  );
  expect(mammalsFile).toContain('import type { Mood } from "./index.ts";');
  expect(mammalsFile).not.toContain("ColumnType");
  expect(mammalsFile).toContain('import type * as World from "./world.ts";');
  expect(mammalsFile).toContain("color: Color;");
  expect(mammalsFile).toContain("ability: World.Ability;");
  expect(mammalsFile).not.toContain("export namespace Mammals");
  expect(mammalsFile).not.toContain("export type Generated<T>");
  expect(mammalsFile).not.toContain("export type Timestamp");
});

test("resolves exports mode index paths from configured type filenames", () => {
  const cases: [string, string[]][] = [
    ["types.ts", ["types/index.ts", "types/mammals.ts"]],
    ["db.types.ts", ["db.types/index.ts", "db.types/mammals.ts"]],
    ["types/index.ts", ["types/index.ts", "types/mammals.ts"]],
    ["custom/types.ts", ["custom/types/index.ts", "custom/types/mammals.ts"]],
  ];

  for (const [typesOutfile, expectedPaths] of cases) {
    const files = generateFiles({
      typesOutfile,
      enums: [createEnum("Color", "mammals")],
      models: [],
      enumNames: ["Color"],
      enumsOutfile: typesOutfile,
      databaseType: createType("DB"),
      schemaGrouping: "exports",
      defaultSchema: "public",
      importExtension: "",
      exportWrappedTypes: false,
    });

    expect(files.map((file) => file.filepath)).toEqual(expectedPaths);
  }
});

test("avoids colliding with the entrypoint for schemas named index", () => {
  const files = generateFiles({
    typesOutfile: "types.ts",
    enums: [createEnum("Color", "index")],
    models: [],
    enumNames: ["Color"],
    enumsOutfile: "types.ts",
    databaseType: createType("DB"),
    schemaGrouping: "exports",
    defaultSchema: "public",
    importExtension: ".ts",
    exportWrappedTypes: false,
  });

  expect(files.map((file) => file.filepath)).toEqual([
    "types/index.ts",
    "types/index.schema.ts",
  ]);
  expect(files[0].content).toContain(
    'export * as Index from "./index.schema.ts";'
  );
});

test("preserves banner content in exports mode schema files", () => {
  const files = generateFiles({
    typesOutfile: "types.ts",
    enums: [createEnum("Color", "mammals")],
    models: [],
    enumNames: ["Color"],
    enumsOutfile: "types.ts",
    databaseType: createType("DB"),
    schemaGrouping: "exports",
    defaultSchema: "public",
    importExtension: "",
    exportWrappedTypes: false,
    banner: "import type { Decimal } from 'decimal.js';",
  });

  expect(
    files[1].content.startsWith("import type { Decimal } from 'decimal.js';")
  ).toEqual(true);
});

test("does not import Timestamp helper for local Timestamp declarations", () => {
  const files = generateFiles({
    typesOutfile: "types.ts",
    enums: [createEnum("Timestamp", "mammals")],
    models: [],
    enumNames: ["Timestamp"],
    enumsOutfile: "types.ts",
    databaseType: createType("DB"),
    schemaGrouping: "exports",
    defaultSchema: "public",
    importExtension: "",
    exportWrappedTypes: false,
  });

  expect(files[1].content).toContain("export type Timestamp =");
  expect(files[1].content).not.toContain(
    'import type { Timestamp } from "./index";'
  );
});

test("keeps separate enum files when schemaGrouping is none", () => {
  const files = generateFiles({
    typesOutfile: "types.ts",
    enums: [createEnum("Color", "mammals")],
    models: [createModel({ typeName: "Elephant", schema: "mammals" })],
    enumNames: ["Color"],
    enumsOutfile: "enums.ts",
    databaseType: createType("DB"),
    schemaGrouping: "none",
    defaultSchema: "public",
    importExtension: "",
    exportWrappedTypes: false,
  });

  expect(files.map((file) => file.filepath)).toEqual(["types.ts", "enums.ts"]);
});

test("ignores enumFileName when namespace schemaGrouping owns grouped enums", () => {
  const files = generateFiles({
    typesOutfile: "types.ts",
    enums: [createEnum("Color", "mammals")],
    models: [createModel({ typeName: "Elephant", schema: "mammals" })],
    enumNames: ["Color"],
    enumsOutfile: "enums.ts",
    databaseType: createType("DB"),
    schemaGrouping: "namespace",
    defaultSchema: "public",
    importExtension: "",
    exportWrappedTypes: false,
  });

  expect(files.map((file) => file.filepath)).toEqual(["types.ts"]);
  expect(files[0].content).toContain("export namespace Mammals");
});
