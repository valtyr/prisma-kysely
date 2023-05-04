import ts from "typescript";
import { expect, test } from "vitest";

import { generateField } from "~/helpers/generateField";
import { stringifyTsNode } from "~/utils/testUtils";

const stringTypeNode = ts.factory.createTypeReferenceNode(
  ts.factory.createIdentifier("string"),
  undefined
);

test("it creates correct annotation for non-nullable types", () => {
  const node = generateField({
    name: "name",
    type: stringTypeNode,
    nullable: false,
    generated: false,
    list: false,
  });
  const result = stringifyTsNode(node);

  expect(result).toEqual("name: string;");
});

test("it creates correct annotation for nullable types", () => {
  const node = generateField({
    name: "name",
    type: stringTypeNode,
    nullable: true,
    generated: false,
    list: false,
  });
  const result = stringifyTsNode(node);

  expect(result).toEqual("name: string | null;");
});

test("it creates correct annotation for generated types", () => {
  const node = generateField({
    name: "name",
    type: stringTypeNode,
    nullable: false,
    generated: true,
    list: false,
  });
  const result = stringifyTsNode(node);

  expect(result).toEqual("name: Generated<string>;");
});

test("it creates correct annotation for list types", () => {
  const node = generateField({
    name: "name",
    type: stringTypeNode,
    nullable: false,
    generated: false,
    list: true,
  });
  const result = stringifyTsNode(node);

  expect(result).toEqual("name: string[];");
});

test("it creates correct annotation for generated nullable list types (do these exist?)", () => {
  // Is this how these work? I have no clue. I don't even know if Kysely supports these.
  // If you run into problems here, please file an issue or create a pull request.

  const node = generateField({
    name: "name",
    type: stringTypeNode,
    nullable: true,
    generated: true,
    list: true,
  });
  const result = stringifyTsNode(node);

  expect(result).toEqual("name: Generated<string | null>[];");
});

test("it prepends a JSDoc comment if documentation is provided", () => {
  const node = generateField({
    name: "name",
    type: stringTypeNode,
    nullable: false,
    generated: false,
    list: false,
    documentation: "This is a comment",
  });
  const result = stringifyTsNode(node);

  expect(result).toEqual("/**\n * This is a comment\n */\nname: string;");
});
