import ts, { createPrinter } from "typescript";
import { expect, test } from "vitest";

import { generateEnumType } from "./generateEnumType";

test("it generates the enum type", () => {
  const { objectDeclaration, typeDeclaration } = generateEnumType("Name", [
    { name: "FOO", dbName: "FOO" },
    { name: "BAR", dbName: "BAR" },
  ])!;

  const printer = createPrinter();

  const result = printer.printList(
    ts.ListFormat.MultiLine,
    ts.factory.createNodeArray([objectDeclaration, typeDeclaration]),
    ts.createSourceFile("", "", ts.ScriptTarget.Latest)
  );

  expect(result).toEqual(`export const Name = {
    FOO: "FOO",
    BAR: "BAR"
} as const;
export type Name = (typeof Name)[keyof typeof Name];\n`);
});
