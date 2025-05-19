import path from "path";
import type { TypeAliasDeclaration } from "typescript";
import ts from "typescript";

import { generateFile } from "~/helpers/generateFile";
import { capitalize } from "~/utils/words";

import type { EnumType } from "./generateEnumType";
import type { ModelType } from "./generateModel";

type File = { filepath: string; content: ReturnType<typeof generateFile> };

export function generateFiles(opts: {
  typesOutfile: string;
  enums: EnumType[];
  models: ModelType[];
  enumNames: string[];
  enumsOutfile: string;
  databaseType: TypeAliasDeclaration;
  groupBySchema: boolean;
  defaultSchema: string;
}) {
  // Don't generate a separate file for enums if there are no enums
  if (opts.enumsOutfile === opts.typesOutfile || opts.enums.length === 0) {
    let statements: Iterable<ts.Statement>;

    if (!opts.groupBySchema) {
      statements = [
        ...opts.enums.flatMap((e) => [e.objectDeclaration, e.typeDeclaration]),
        ...opts.models.map((m) => m.definition),
      ];
    } else {
      statements = groupModelsAndEnum(
        opts.enums,
        opts.models,
        opts.defaultSchema
      );
    }

    const typesFileWithEnums: File = {
      filepath: opts.typesOutfile,
      content: generateFile([...statements, opts.databaseType], {
        withEnumImport: false,
        withLeader: true,
      }),
    };

    return [typesFileWithEnums];
  }

  const typesFileWithoutEnums: File = {
    filepath: opts.typesOutfile,
    content: generateFile(
      [...opts.models.map((m) => m.definition), opts.databaseType],
      {
        withEnumImport: {
          importPath: `./${path.parse(opts.enumsOutfile).name}`,
          names: opts.enumNames,
        },
        withLeader: true,
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
      }
    ),
  };

  return [typesFileWithoutEnums, enumFile];
}

export function* groupModelsAndEnum(
  enums: EnumType[],
  models: ModelType[],
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
      yield model.definition;
      continue;
    }

    const group = groupsMap.get(model.schema);

    if (!group) {
      groupsMap.set(model.schema, [model.definition]);
    } else {
      group.push(model.definition);
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
