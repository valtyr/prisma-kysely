import { expect, test } from "vitest";

import { generateFile } from "~/helpers/generateFile";

test("generates a file!", () => {
  expect(() => {
    generateFile([]);
  }).not.toThrow();
});
