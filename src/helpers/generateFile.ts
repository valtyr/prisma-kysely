import ts from "typescript";

const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

type Options = {
  withEnumImport: false | { importPath: string; names: string[] };
};

export const generateFile = (
  statements: readonly ts.Statement[],
  { withEnumImport }: Options
) => {
  const file = ts.factory.createSourceFile(
    statements,
    ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
    ts.NodeFlags.None
  );

  const result = printer.printFile(file);

  const leader = `import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
    ? ColumnType<S, I | undefined, U>
    : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;`;

  if (withEnumImport) {
    const withEnumImportPath = withEnumImport.importPath.replace(".ts", "");
    const enumImportStatement = `import type { ${withEnumImport.names.join(
      ", "
    )} } from "${withEnumImportPath}";`;

    return `${leader}\n\n${enumImportStatement}\n\n${result}`;
  }
  return result;
};
