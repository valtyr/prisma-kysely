import { validateConfig } from "./validateConfig";

afterEach(() => {
  jest.clearAllMocks();
});

test("should exit with error code when invalid config encountered", () => {
  const mockExitFunction = jest.fn<never, never>();
  const consoleErrorFunction = jest.fn();

  process.exit = mockExitFunction;
  console.error = consoleErrorFunction;

  validateConfig({
    databaseProvider: "postgers",
    testField: "wrong",
  });

  expect(mockExitFunction).toHaveBeenCalled();
  expect(consoleErrorFunction).toHaveBeenCalled();
});
