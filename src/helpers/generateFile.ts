import ts from "typescript";

const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

type Options = {
  withEnumImport: false | { importPath: string; names: string[] };
  withLeader: boolean;
};

export const generateFile = (
  statements: readonly ts.Statement[],
  { withEnumImport, withLeader }: Options
) => {
  const file = ts.factory.createSourceFile(
    statements,
    ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
    ts.NodeFlags.None
  );

  const result = printer.printFile(file);

  const leader = `import type { ColumnType, Generated, GeneratedAlways } from "kysely";
export type Timestamp = ColumnType<Date, Date | string, Date | string>;`;

  if (withEnumImport) {
    const enumImportStatement = `import type { ${withEnumImport.names.join(
      ", "
    )} } from "${withEnumImport.importPath}";`;

    return withLeader
      ? `${leader}\n\n${enumImportStatement}\n\n${result}`
      : `${enumImportStatement}\n\n${result}`;
  }

  return withLeader ? `${leader}\n\n${result}` : result;
};
