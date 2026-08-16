import ts from "typescript";

const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

type Options = {
  withEnumImport: false | { importPath: string; names: string[] };
  withLeader: boolean;
  exportWrappedTypes: boolean;
  banner?: string;
  extraHeader?: string[];
  kyselyTypeExports?: string[];
};

/**
 * Prints TypeScript statements with the shared generated-file prelude and optional import/export headers.
 */
export const generateFile = (
  statements: readonly ts.Statement[],
  {
    withEnumImport,
    withLeader,
    exportWrappedTypes,
    banner,
    extraHeader,
    kyselyTypeExports,
  }: Options
) => {
  const file = ts.factory.createSourceFile(
    statements,
    ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
    ts.NodeFlags.None
  );

  const result = printer.printFile(file);

  const kyselyTypeExportStatement = kyselyTypeExports?.length
    ? `export type { ${kyselyTypeExports.join(", ")} } from "kysely";\n`
    : "";

  const leader = `${banner ? `${banner}\n` : ""}import type { ColumnType${
    result.includes("GeneratedAlways") ? ", GeneratedAlways" : ""
  }${
    exportWrappedTypes ? ", Insertable, Selectable, Updateable" : ""
  } } from "kysely";
${kyselyTypeExportStatement}export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;`;

  const header = extraHeader?.length ? `${extraHeader.join("\n")}\n\n` : "";

  if (withEnumImport) {
    const enumImportStatement = `import type { ${withEnumImport.names.join(
      ", "
    )} } from "${withEnumImport.importPath}";`;

    return withLeader
      ? `${leader}\n\n${header}${enumImportStatement}\n\n${result}`
      : `${header}${enumImportStatement}\n\n${result}`;
  }

  return withLeader ? `${leader}\n\n${header}${result}` : `${header}${result}`;
};
