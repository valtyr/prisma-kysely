import ts from "typescript";
import { expect, test } from "vitest";

import { stringifyTsNode } from "~/utils/testUtils";

import { convertToWrappedTypes } from "./wrappedTypeHelpers";

test("it returns Kysely wrapped types", () => {
  const modelDefinition = ts.factory.createTypeAliasDeclaration(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    "User",
    undefined,
    ts.factory.createTypeLiteralNode([
      ts.factory.createPropertySignature(
        undefined,
        "id",
        undefined,
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
      ),
      ts.factory.createPropertySignature(
        undefined,
        "name",
        undefined,
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
      ),
    ])
  );

  const results = convertToWrappedTypes(modelDefinition);
  const resultsAsCode = results.map(stringifyTsNode);

  expect(resultsAsCode).toEqual([
    `export type UserTable = {
    id: string;
    name: string;
};`,
    "export type User = Selectable<UserTable>;",
    "export type NewUser = Insertable<UserTable>;",
    "export type UserUpdate = Updateable<UserTable>;",
  ]);
});
