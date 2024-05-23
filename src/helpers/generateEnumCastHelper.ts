import type { DMMF } from "@prisma/generator-helper";
import type { Identifier } from "typescript";
import ts from "typescript";

import isValidTSIdentifier from "~/utils/isValidTSIdentifier";

export const generateEnumCastHelper = (
  enums: DMMF.DatamodelEnum[],
  multiSchemaMap?: Map<string, string>
) => {
  if (!enums.length) return [];

  const namesObjectDeclaration = ts.factory.createVariableStatement(
    [],
    ts.factory.createVariableDeclarationList(
      [
        ts.factory.createVariableDeclaration(
          "EnumNames",
          undefined,
          undefined,
          ts.factory.createAsExpression(
            ts.factory.createObjectLiteralExpression(
              enums.map((e) => {
                const schemaName = multiSchemaMap?.get(e.name);
                // dbName holds the "@@map("name")" value from the Prisma schema if it exists, otherwise fall back to the name
                const dbName = e.dbName || e.name;
                // Prepend the schema name if we have one
                const dbNameWithSchema = schemaName
                  ? `${schemaName}.${dbName}`
                  : dbName;
                const identifier = isValidTSIdentifier(dbNameWithSchema)
                  ? ts.factory.createIdentifier(dbNameWithSchema)
                  : ts.factory.createStringLiteral(dbNameWithSchema);

                return ts.factory.createPropertyAssignment(
                  identifier,
                  ts.factory.createIdentifier(e.name)
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

  const namesTypeDeclaration = ts.factory.createTypeAliasDeclaration(
    [],
    "EnumNames",
    [],
    ts.factory.createTypeQueryNode(
      namesObjectDeclaration.declarationList.declarations[0].name as Identifier
    )
  );
  const nameTypeParameterDeclaration =
    ts.factory.createTypeParameterDeclaration(
      [],
      "Name",
      ts.factory.createTypeOperatorNode(
        ts.SyntaxKind.KeyOfKeyword,
        ts.factory.createTypeReferenceNode(namesTypeDeclaration.name)
      )
    );
  const indexedNameAccessType = ts.factory.createIndexedAccessTypeNode(
    ts.factory.createTypeReferenceNode(namesTypeDeclaration.name),
    ts.factory.createTypeReferenceNode(nameTypeParameterDeclaration.name)
  );

  const valuesTypeDeclaration = ts.factory.createTypeAliasDeclaration(
    [],
    "EnumValues",
    [nameTypeParameterDeclaration],
    ts.factory.createIndexedAccessTypeNode(
      indexedNameAccessType,
      ts.factory.createTypeOperatorNode(
        ts.SyntaxKind.KeyOfKeyword,
        indexedNameAccessType
      )
    )
  );

  const valueTypeParameterDeclaration =
    ts.factory.createTypeParameterDeclaration(
      [],
      "Value",
      ts.factory.createUnionTypeNode([
        ts.factory.createTypeReferenceNode(valuesTypeDeclaration.name, [
          ts.factory.createTypeReferenceNode(nameTypeParameterDeclaration.name),
        ]),
        ts.factory.createLiteralTypeNode(ts.factory.createNull()),
      ])
    );

  const nameParameterDeclaration = ts.factory.createParameterDeclaration(
    [],
    undefined,
    "name",
    undefined,
    ts.factory.createTypeReferenceNode(nameTypeParameterDeclaration.name)
  );
  const valueParameterDeclaration = ts.factory.createParameterDeclaration(
    [],
    undefined,
    "value",
    undefined,
    ts.factory.createUnionTypeNode([
      ts.factory.createTypeReferenceNode(valueTypeParameterDeclaration.name),
      ts.factory.createTypeReferenceNode("ExpressionWrapper", [
        ts.factory.createTypeReferenceNode("any"),
        ts.factory.createTypeReferenceNode("any"),
        ts.factory.createTypeReferenceNode(valueTypeParameterDeclaration.name),
      ]),
    ])
  );

  const castEnumValueFunctionDeclaration = ts.factory.createFunctionDeclaration(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    undefined,
    "castEnumValue",
    [nameTypeParameterDeclaration, valueTypeParameterDeclaration],
    [valueParameterDeclaration, nameParameterDeclaration],
    ts.factory.createTypeReferenceNode("RawBuilder", [
      ts.factory.createTypeReferenceNode(valueTypeParameterDeclaration.name),
    ]),
    ts.factory.createBlock([
      ts.factory.createReturnStatement(
        ts.factory.createTaggedTemplateExpression(
          ts.factory.createIdentifier("sql"),
          [
            ts.factory.createTypeReferenceNode(
              valueTypeParameterDeclaration.name
            ),
          ],
          ts.factory.createTemplateExpression(
            ts.factory.createTemplateHead(""),
            [
              ts.factory.createTemplateSpan(
                valueParameterDeclaration.name as Identifier,
                ts.factory.createTemplateMiddle("::")
              ),
              ts.factory.createTemplateSpan(
                ts.factory.createCallExpression(
                  ts.factory.createPropertyAccessExpression(
                    ts.factory.createIdentifier("sql"),
                    ts.factory.createIdentifier("id")
                  ),
                  undefined,
                  [nameParameterDeclaration.name as Identifier]
                ),
                ts.factory.createTemplateTail("")
              ),
            ]
          )
        )
      ),
    ])
  );

  return [
    namesObjectDeclaration,
    namesTypeDeclaration,
    valuesTypeDeclaration,
    castEnumValueFunctionDeclaration,
  ];
};
