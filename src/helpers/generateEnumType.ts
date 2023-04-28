import type { DMMF } from "@prisma/generator-helper";
import ts from "typescript";

import isValidTSIdentifier from "~/utils/isValidTSIdentifier";

import { generateStringLiteralUnion } from "./generateStringLiteralUnion";
import { generateTypedAliasDeclaration } from "./generateTypedAliasDeclaration";

export const generateEnumType = (name: string, values: DMMF.EnumValue[]) => {
  const type = generateStringLiteralUnion(values.map((v) => v.name));

  if (!type) return [];

  const objectDeclaration = ts.factory.createVariableStatement(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createVariableDeclarationList(
      [
        ts.factory.createVariableDeclaration(
          name,
          undefined,
          undefined,
          ts.factory.createObjectLiteralExpression(
            values.map((v) => {
              const identifier = isValidTSIdentifier(v.name)
                ? ts.factory.createIdentifier(v.name)
                : ts.factory.createStringLiteral(v.name);

              return ts.factory.createPropertyAssignment(
                identifier,
                ts.factory.createStringLiteral(v.name)
              );
            }),
            true
          )
        ),
      ],
      ts.NodeFlags.Const
    )
  );

  const typeDeclaration = generateTypedAliasDeclaration(name, type);

  return [typeDeclaration, objectDeclaration];
};
