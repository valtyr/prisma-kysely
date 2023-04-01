import assert from "assert";
import { expect, test } from "vitest";

import { generateStringLiteralUnion } from "~/helpers/generateStringLiteralUnion";
import { stringifyTsNode } from "~/utils/testUtils";

test("it returns null for 0 items", () => {
  const node = generateStringLiteralUnion([]);

  expect(node).toBeNull();
});

test("it generates string literal unions for 1 item", () => {
  const node = generateStringLiteralUnion(["option1"]);

  assert(node != null);

  const result = stringifyTsNode(node);

  expect(result).toEqual('"option1"');
});

test("it generates string literal unions for 2 items", () => {
  const node = generateStringLiteralUnion(["option1", "option2"]);

  assert(node != null);

  const result = stringifyTsNode(node);

  expect(result).toEqual('"option1" | "option2"');
});
