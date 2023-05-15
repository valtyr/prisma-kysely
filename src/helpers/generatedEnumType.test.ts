import ts, { createPrinter } from "typescript";
import { expect, test } from "vitest";

import { generateEnumType } from "./generateEnumType";

test("it generates the enum type", () => {
  const [objectDeclaration, typeDeclaration] = generateEnumType("Name", [
    { name: "FOO", dbName: "FOO" },
    { name: "BAR", dbName: "BAR" },
  ]);

  const printer = createPrinter();

  const result = printer.printList(
    ts.ListFormat.MultiLine,
    ts.factory.createNodeArray([objectDeclaration, typeDeclaration]),
    ts.createSourceFile("", "", ts.ScriptTarget.Latest)
  );

  expect(result).toEqual(`export type Name = "FOO" | "BAR";
export const Name = {
    FOO: "FOO",
    BAR: "BAR"
};\n`);
});

test("it generates the enum type when using Prisma's @map()", () => {
  const [objectDeclaration, typeDeclaration] = generateEnumType("Name", [
    { name: "FOO", dbName: "foo" },
    { name: "BAR", dbName: "bar" },
  ]);

  const printer = createPrinter();

  const result = printer.printList(
    ts.ListFormat.MultiLine,
    ts.factory.createNodeArray([objectDeclaration, typeDeclaration]),
    ts.createSourceFile("", "", ts.ScriptTarget.Latest)
  );

  expect(result).toEqual(`export type Name = "FOO" | "BAR";
export const Name = {
    FOO: "foo",
    BAR: "bar"
};\n`);
});
