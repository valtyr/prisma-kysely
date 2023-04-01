import { afterEach, expect, test, vi } from "vitest";

import { formatFile } from "~/utils/formatFile";

afterEach(() => {
  vi.clearAllMocks();
});

test("formats a file!", () => {
  expect(() => {
    formatFile("");
  }).not.toThrow();
});
