import path from "node:path";
import type { TypeAliasDeclaration } from "typescript";
import ts from "typescript";

import { generateFile } from "./generateFile.ts";
import type { EnumType } from "./generateEnumType.ts";
import type { ModelType } from "./generateModel.ts";
import { convertToWrappedTypes } from "./wrappedTypeHelpers.ts";
import { capitalize } from "../utils/words.ts";

type File = { filepath: string; content: ReturnType<typeof generateFile> };
type MultiDefsModelType = Omit<ModelType, "definition"> & {
  definitions: ts.TypeAliasDeclaration[];
};

/**
 * Creates the generated output files for the configured layout.
 */
export function generateFiles(opts: {
  typesOutfile: string;
  enums: EnumType[];
  models: ModelType[];
  enumNames: string[];
  enumsOutfile: string;
  databaseType: TypeAliasDeclaration;
  schemaGrouping: "none" | "namespace" | "exports";
  defaultSchema: string;
  importExtension: string;
  exportWrappedTypes: boolean;
  banner?: string;
}) {
  const models = opts.models.map(
    ({ definition, ...rest }: ModelType): MultiDefsModelType => ({
      ...rest,
      definitions: opts.exportWrappedTypes
        ? convertToWrappedTypes(definition)
        : [definition],
    })
  );

  if (opts.schemaGrouping === "exports") {
    return generateSchemaExportFiles({
      ...opts,
      models,
    });
  }

  // Grouped output owns enum placement so enumFileName cannot split schemas across incompatible files.
  if (
    opts.schemaGrouping !== "none" ||
    opts.enumsOutfile === opts.typesOutfile ||
    opts.enums.length === 0
  ) {
    let statements: Iterable<ts.Statement>;

    if (opts.schemaGrouping === "none") {
      statements = [
        ...opts.enums.flatMap((e) => [e.objectDeclaration, e.typeDeclaration]),
        ...models.flatMap((m) => m.definitions),
      ];
    } else {
      statements = groupModelsAndEnum(opts.enums, models, opts.defaultSchema);
    }

    const typesFileWithEnums: File = {
      filepath: opts.typesOutfile,
      content: generateFile([...statements, opts.databaseType], {
        withEnumImport: false,
        withLeader: true,
        exportWrappedTypes: opts.exportWrappedTypes,
        banner: opts.banner,
      }),
    };

    return [typesFileWithEnums];
  }

  const typesFileWithoutEnums: File = {
    filepath: opts.typesOutfile,
    content: generateFile(
      [...models.flatMap((m) => m.definitions), opts.databaseType],
      {
        withEnumImport: {
          importPath: `./${path.parse(opts.enumsOutfile).name}${opts.importExtension}`,
          names: opts.enumNames,
        },
        withLeader: true,
        exportWrappedTypes: opts.exportWrappedTypes,
        banner: opts.banner,
      }
    ),
  };

  if (opts.enums.length === 0) return [typesFileWithoutEnums];

  const enumFile: File = {
    filepath: opts.enumsOutfile,
    content: generateFile(
      opts.enums.flatMap((e) => [e.objectDeclaration, e.typeDeclaration]),
      {
        withEnumImport: false,
        withLeader: false,
        exportWrappedTypes: opts.exportWrappedTypes,
        banner: opts.banner,
      }
    ),
  };

  return [typesFileWithoutEnums, enumFile];
}

/**
 * Splits grouped schemas into standalone files while keeping the index usable as the DB entrypoint.
 */
function generateSchemaExportFiles(
  opts: Omit<Parameters<typeof generateFiles>[0], "models"> & {
    models: MultiDefsModelType[];
  }
): File[] {
  const { indexFilepath, schemaDir } = getSchemaExportPaths(opts.typesOutfile);
  const defaultStatements: ts.Statement[] = [];
  const schemaGroups = new Map<string, ts.Statement[]>();
  const schemaImports = new Map<
    string,
    { namespaces: Set<string>; defaultTypes: Set<string> }
  >();

  for (const enumType of opts.enums) {
    if (!enumType.schema || enumType.schema === opts.defaultSchema) {
      defaultStatements.push(
        enumType.objectDeclaration,
        enumType.typeDeclaration
      );
      continue;
    }

    getOrSet(schemaGroups, enumType.schema, []).push(
      enumType.objectDeclaration,
      enumType.typeDeclaration
    );
  }

  for (const model of opts.models) {
    if (!model.schema || model.schema === opts.defaultSchema) {
      defaultStatements.push(...model.definitions);
      continue;
    }

    getOrSet(schemaGroups, model.schema, []).push(...model.definitions);

    const imports = getOrSet(schemaImports, model.schema, {
      namespaces: new Set<string>(),
      defaultTypes: new Set<string>(),
    });

    for (const referencedType of model.referencedSchemaTypes) {
      if (referencedType.schema === model.schema) continue;

      if (referencedType.schema === opts.defaultSchema) {
        imports.defaultTypes.add(referencedType.typeName);
      } else {
        imports.namespaces.add(referencedType.schema);
      }
    }
  }

  const schemaNames = [...schemaGroups.keys()];
  const schemaKyselyTypeExports = getSchemaKyselyTypeExports(schemaGroups);
  const indexFile: File = {
    filepath: indexFilepath,
    content: generateFile([...defaultStatements, opts.databaseType], {
      withEnumImport: false,
      withLeader: true,
      exportWrappedTypes: opts.exportWrappedTypes,
      banner: opts.banner,
      kyselyTypeExports: schemaKyselyTypeExports,
      extraHeader: schemaNames.flatMap((schema) => {
        const namespace = capitalize(schema);
        const importPath = `./${getSchemaFileName(schema)}${opts.importExtension}`;

        // The import gives DB a local namespace type; the export keeps the public API requested by schemaGrouping=exports.
        return [
          `import type * as ${namespace} from "${importPath}";`,
          `export * as ${namespace} from "${importPath}";`,
        ];
      }),
    }),
  };

  const schemaFiles: File[] = schemaNames.map((schema) => {
    const imports = schemaImports.get(schema);
    const group = schemaGroups.get(schema) ?? [];
    const indexHelperImports = getIndexHelperImports(group);
    const extraHeader = [
      ...(opts.banner ? [opts.banner] : []),
      // Split schema files intentionally type-import helpers from the entrypoint to avoid exporting duplicate utilities.
      ...(indexHelperImports.length
        ? [
            `import type { ${indexHelperImports.join(", ")} } from "./index${opts.importExtension}";`,
          ]
        : []),
      ...(imports?.defaultTypes.size
        ? [
            `import type { ${[...imports.defaultTypes].sort().join(", ")} } from "./index${opts.importExtension}";`,
          ]
        : []),
      ...[...(imports?.namespaces ?? [])]
        .sort()
        .map(
          (referencedSchema) =>
            `import type * as ${capitalize(referencedSchema)} from "./${getSchemaFileName(referencedSchema)}${opts.importExtension}";`
        ),
    ];

    return {
      filepath: path.join(schemaDir, `${getSchemaFileName(schema)}.ts`),
      content: generateFile(group, {
        withEnumImport: false,
        withLeader: false,
        exportWrappedTypes: opts.exportWrappedTypes,
        banner: opts.banner,
        extraHeader,
      }),
    };
  });

  return [indexFile, ...schemaFiles];
}

/**
 * Imports only helpers referenced by the schema file to keep split output small.
 */
function getIndexHelperImports(statements: ts.Statement[]) {
  const imports = new Set<string>();

  if (usesTypeReference(statements, "Generated")) imports.add("Generated");
  if (usesTypeReference(statements, "GeneratedAlways")) {
    imports.add("GeneratedAlways");
  }
  if (usesTypeReference(statements, "Timestamp")) imports.add("Timestamp");
  if (usesTypeReference(statements, "Insertable")) imports.add("Insertable");
  if (usesTypeReference(statements, "Selectable")) imports.add("Selectable");
  if (usesTypeReference(statements, "Updateable")) imports.add("Updateable");

  return [...imports].sort();
}

/**
 * Detects helper usage from type references instead of raw text to avoid local declaration collisions.
 */
function usesTypeReference(statements: ts.Statement[], typeName: string) {
  let found = false;

  const visit = (node: ts.Node): void => {
    if (found) return;

    if (
      ts.isTypeReferenceNode(node) &&
      ts.isIdentifier(node.typeName) &&
      node.typeName.text === typeName
    ) {
      found = true;
      return;
    }

    ts.forEachChild(node, visit);
  };

  for (const statement of statements) {
    visit(statement);
    if (found) break;
  }

  return found;
}

/**
 * Re-exports only Kysely helpers needed by schema-file imports.
 */
function getSchemaKyselyTypeExports(schemaGroups: Map<string, ts.Statement[]>) {
  const exports = new Set<string>();

  for (const statements of schemaGroups.values()) {
    for (const helper of getIndexHelperImports(statements)) {
      if (
        helper === "GeneratedAlways" ||
        helper === "Insertable" ||
        helper === "Selectable" ||
        helper === "Updateable"
      ) {
        exports.add(helper);
      }
    }
  }

  return [...exports].sort();
}

/**
 * Avoids clobbering the exports-mode entrypoint when a database schema is named `index`.
 */
function getSchemaFileName(schema: string) {
  return schema === "index" ? "index.schema" : schema;
}

/**
 * Resolves option B paths where a configured types file becomes a directory index in exports mode.
 */
function getSchemaExportPaths(typesOutfile: string) {
  const parsed = path.parse(typesOutfile);

  if (parsed.name === "index") {
    return {
      indexFilepath: typesOutfile,
      schemaDir: parsed.dir,
    };
  }

  const schemaDir = path.join(parsed.dir, parsed.name);

  return {
    indexFilepath: path.join(schemaDir, `index${parsed.ext || ".ts"}`),
    schemaDir,
  };
}

/**
 * Returns an existing map value or stores the provided empty collection for incremental grouping.
 */
function getOrSet<K, V>(map: Map<K, V>, key: K, value: V) {
  const existing = map.get(key);

  if (existing) return existing;

  map.set(key, value);
  return value;
}

/**
 * Groups non-default schema declarations under TypeScript namespaces for the legacy layout.
 */
export function* groupModelsAndEnum(
  enums: EnumType[],
  models: MultiDefsModelType[],
  defaultSchema: string
): Generator<ts.Statement, void, void> {
  const groupsMap = new Map<string, ts.Statement[]>();

  for (const enumType of enums) {
    if (!enumType.schema || enumType.schema === defaultSchema) {
      yield enumType.objectDeclaration;
      yield enumType.typeDeclaration;
      continue;
    }

    const group = groupsMap.get(enumType.schema);

    if (!group) {
      groupsMap.set(enumType.schema, [
        enumType.objectDeclaration,
        enumType.typeDeclaration,
      ]);
    } else {
      group.push(enumType.objectDeclaration, enumType.typeDeclaration);
    }
  }

  for (const model of models) {
    if (!model.schema || model.schema === defaultSchema) {
      yield* model.definitions;
      continue;
    }

    const group = groupsMap.get(model.schema);

    if (!group) {
      groupsMap.set(model.schema, model.definitions);
    } else {
      group.push(...model.definitions);
    }
  }

  for (const [schema, group] of groupsMap) {
    yield ts.factory.createModuleDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      ts.factory.createIdentifier(capitalize(schema)),
      ts.factory.createModuleBlock(group),
      ts.NodeFlags.Namespace
    );
  }
}
