import path from "path";
import type { TypeAliasDeclaration, VariableStatement } from "typescript";

import { generateFile } from "~/helpers/generateFile";

type File = { filepath: string; content: ReturnType<typeof generateFile> };

export function generateFiles(opts: {
  typesOutfile: string;
  enums: (VariableStatement | TypeAliasDeclaration)[];
  enumNames: string[];
  enumsOutfile: string;
  databaseType: TypeAliasDeclaration;
  modelDefinitions: TypeAliasDeclaration[];
}) {
  // Don't generate a separate file for enums if there are no enums
  if (opts.enumsOutfile === opts.typesOutfile || opts.enums.length === 0) {
    const typesFileWithEnums: File = {
      filepath: opts.typesOutfile,
      content: generateFile(
        [...opts.enums, ...opts.modelDefinitions, opts.databaseType],
        {
          withEnumImport: false,
          withLeader: true,
        }
      ),
    };

    return [typesFileWithEnums];
  }

  const typesFileWithoutEnums: File = {
    filepath: opts.typesOutfile,
    content: generateFile([...opts.modelDefinitions, opts.databaseType], {
      withEnumImport: {
        importPath: `./${path.parse(opts.enumsOutfile).name}`,
        names: opts.enumNames,
      },
      withLeader: true,
    }),
  };

  if (opts.enums.length === 0) return [typesFileWithoutEnums];

  const enumFile: File = {
    filepath: opts.enumsOutfile,
    content: generateFile(opts.enums, {
      withEnumImport: false,
      withLeader: false,
    }),
  };

  return [typesFileWithoutEnums, enumFile];
}
