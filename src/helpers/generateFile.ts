import ts from "typescript";

import { formatFile } from "../utils/formatFile";

const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

export const generateFile = (statements: readonly ts.Statement[]) => {
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

  return `${leader}\n${result}`;
};
