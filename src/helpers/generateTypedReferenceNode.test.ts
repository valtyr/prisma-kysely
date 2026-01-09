import { expect, test } from "bun:test";

import { stringifyTsNode } from "../utils/testUtils.ts";

import { generateTypedReferenceNode } from "./generateTypedReferenceNode.ts";

test("it generated the typed reference node", () => {
  const node = generateTypedReferenceNode("Name");

  const result = stringifyTsNode(node);

  expect(result).toEqual(
    "export type Name = (typeof Name)[keyof typeof Name];"
  );
});
