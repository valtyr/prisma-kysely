import { stringifyTsNode } from "../utils/testUtils";
import { generateTypedAliasDeclaration } from "./generateTypedAliasDeclaration";
import ts from "typescript";

test("it creates and exports a type alias :D", () => {
  const node = generateTypedAliasDeclaration(
    "typeOne",
    ts.factory.createLiteralTypeNode(ts.factory.createNull())
  );
  const result = stringifyTsNode(node);

  expect(result).toEqual(`export type typeOne = null;`);
});
