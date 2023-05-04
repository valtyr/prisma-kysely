import { afterEach, expect, test, vi } from "vitest";

import { validateConfig } from "./validateConfig";

afterEach(() => {
  vi.clearAllMocks();
});

test("should exit with error code when invalid config encountered", () => {
  const mockExitFunction = vi.fn<never, never>();
  const consoleErrorFunction = vi.fn();

  process.exit = mockExitFunction;
  console.error = consoleErrorFunction;

  validateConfig({
    databaseProvider: "postgers",
    testField: "wrong",
  });

  expect(mockExitFunction).toHaveBeenCalled();
  expect(consoleErrorFunction).toHaveBeenCalled();
});
