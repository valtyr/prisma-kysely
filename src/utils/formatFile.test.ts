import { expect, test } from "bun:test";

import { formatFile } from "./formatFile.ts";

test("formats a file!", () => {
  expect(() => {
    formatFile("");
  }).not.toThrow();
});
