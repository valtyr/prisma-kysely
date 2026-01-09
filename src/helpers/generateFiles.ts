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

export function generateFiles(opts: {
  typesOutfile: string;
  enums: EnumType[];
  models: ModelType[];
  enumNames: string[];
  enumsOutfile: string;
  databaseType: TypeAliasDeclaration;
  groupBySchema: boolean;
  defaultSchema: string;
  importExtension: string;
  exportWrappedTypes: boolean;
}) {
  const models = opts.models.map(
    ({ definition, ...rest }: ModelType): MultiDefsModelType => ({
      ...rest,
      definitions: opts.exportWrappedTypes
        ? convertToWrappedTypes(definition)
        : [definition],
    })
  );

  // Don't generate a separate file for enums if there are no enums
  if (opts.enumsOutfile === opts.typesOutfile || opts.enums.length === 0) {
    let statements: Iterable<ts.Statement>;

    if (!opts.groupBySchema) {
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
      }
    ),
  };

  return [typesFileWithoutEnums, enumFile];
}

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
