import { generateFile } from "./generateFile";

test("generates a file!", () => {
  expect(() => {
    generateFile([]);
  }).not.toThrow();
});
