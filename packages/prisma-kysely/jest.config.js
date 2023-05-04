/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  modulePathIgnorePatterns: ["__helpers__/", "__fixtures__/"],
  coveragePathIgnorePatterns: [
    "src/bin.ts",
    "src/constants.ts",
    "src/generator.ts",
  ],
};
