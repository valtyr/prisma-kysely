import { formatFile } from "~/utils/formatFile";

afterEach(() => {
  jest.clearAllMocks();
});

test("formats a file!", () => {
  expect(() => {
    formatFile("");
  }).not.toThrow();
});
