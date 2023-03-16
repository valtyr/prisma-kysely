import ts from "typescript";

export const generateDatabaseType = (
  models: { tableName: string; typeName: string }[]
) => {
  const properties = models.map((field) => {
    return ts.factory.createPropertySignature(
      undefined,
      ts.factory.createIdentifier(field.tableName),
      undefined,
      ts.factory.createTypeReferenceNode(
        ts.factory.createIdentifier(field.typeName),
        undefined
      )
    );
  });

  return ts.factory.createTypeAliasDeclaration(
    undefined,
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier("DB"),
    undefined,
    ts.factory.createTypeLiteralNode(properties)
  );
};
