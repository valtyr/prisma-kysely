import path from "path";
import type { TypeAliasDeclaration, VariableStatement } from "typescript";

import { generateFile } from "~/helpers/generateFile";

import { convertToWrappedTypes } from "./wrappedTypeHelpers";

type File = { filepath: string; content: ReturnType<typeof generateFile> };

export function generateFiles(opts: {
  typesOutfile: string;
  enums: (VariableStatement | TypeAliasDeclaration)[];
  enumNames: string[];
  enumsOutfile: string;
  databaseType: TypeAliasDeclaration;
  modelDefinitions: TypeAliasDeclaration[];
  exportWrappedTypes: boolean;
}) {
  const modelDefinitions = opts.exportWrappedTypes
    ? convertToWrappedTypes(opts.modelDefinitions)
    : opts.modelDefinitions;

  // Don't generate a separate file for enums if there are no enums
  if (opts.enumsOutfile === opts.typesOutfile || opts.enums.length === 0) {
    const typesFileWithEnums: File = {
      filepath: opts.typesOutfile,
      content: generateFile(
        [...opts.enums, ...modelDefinitions, opts.databaseType],
        {
          withEnumImport: false,
          withLeader: true,
          exportWrappedTypes: opts.exportWrappedTypes,
        }
      ),
    };

    return [typesFileWithEnums];
  }

  const typesFileWithoutEnums: File = {
    filepath: opts.typesOutfile,
    content: generateFile([...modelDefinitions, opts.databaseType], {
      withEnumImport: {
        importPath: `./${path.parse(opts.enumsOutfile).name}`,
        names: opts.enumNames,
      },
      withLeader: true,
      exportWrappedTypes: opts.exportWrappedTypes,
    }),
  };

  if (opts.enums.length === 0) return [typesFileWithoutEnums];

  const enumFile: File = {
    filepath: opts.enumsOutfile,
    content: generateFile(opts.enums, {
      withEnumImport: false,
      withLeader: false,
      exportWrappedTypes: opts.exportWrappedTypes,
    }),
  };

  return [typesFileWithoutEnums, enumFile];
}
