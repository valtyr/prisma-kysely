import { expect, test } from "vitest";

import { stringifyTsNode } from "~/utils/testUtils";

import { generateTypedReferenceNode } from "./generateTypedReferenceNode";

test("it generated the typed reference node", () => {
  const node = generateTypedReferenceNode("Name");

  const result = stringifyTsNode(node);

  expect(result).toEqual(
    "export type Name = (typeof Name)[keyof typeof Name];"
  );
});
