import type { DMMF } from "@prisma/generator-helper";
import ts from "typescript";

import isValidTSIdentifier from "~/utils/isValidTSIdentifier";

import { generateStringLiteralUnion } from "./generateStringLiteralUnion";
import { generateTypedReferenceNode } from "./generateTypedReferenceNode";

export type EnumType = {
  objectDeclaration: ts.VariableStatement;
  typeDeclaration: ts.TypeAliasDeclaration;
  schema?: string;
  typeName: string;
};

export const generateEnumType = (
  name: string,
  values: readonly DMMF.EnumValue[]
): EnumType | undefined => {
  const type = generateStringLiteralUnion(values.map((v) => v.name));

  if (!type) {
    return undefined;
  }

  const objectDeclaration = ts.factory.createVariableStatement(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createVariableDeclarationList(
      [
        ts.factory.createVariableDeclaration(
          name,
          undefined,
          undefined,
          ts.factory.createAsExpression(
            ts.factory.createObjectLiteralExpression(
              values.map((v) => {
                const identifier = isValidTSIdentifier(v.name)
                  ? ts.factory.createIdentifier(v.name)
                  : ts.factory.createStringLiteral(v.name);

                return ts.factory.createPropertyAssignment(
                  identifier,
                  // dbName holds the "@map("value")" value from the Prisma schema if it exists, otherwise fallback to the name
                  ts.factory.createStringLiteral(v.dbName || v.name)
                );
              }),
              true
            ),
            ts.factory.createTypeReferenceNode(
              ts.factory.createIdentifier("const"),
              undefined
            )
          )
        ),
      ],
      ts.NodeFlags.Const
    )
  );

  const typeDeclaration = generateTypedReferenceNode(name);

  return {
    typeName: name,
    objectDeclaration,
    typeDeclaration,
  };
};
