import ts from "typescript";
import { expect, test } from "vitest";

import { generateTypedAliasDeclaration } from "~/helpers/generateTypedAliasDeclaration";
import { stringifyTsNode } from "~/utils/testUtils";

test("it creates and exports a type alias :D", () => {
  const node = generateTypedAliasDeclaration(
    "typeOne",
    ts.factory.createLiteralTypeNode(ts.factory.createNull())
  );
  const result = stringifyTsNode(node);

  expect(result).toEqual(`export type typeOne = null;`);
});
