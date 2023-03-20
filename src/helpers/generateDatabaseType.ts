import ts from "typescript";

export const generateDatabaseType = (models: string[]) => {
  const properties = models.map((field) => {
    return ts.factory.createPropertySignature(
      undefined,
      ts.factory.createIdentifier(field),
      undefined,
      ts.factory.createTypeReferenceNode(
        ts.factory.createIdentifier(field),
        undefined
      )
    );
  });

  return ts.factory.createTypeAliasDeclaration(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier("DB"),
    undefined,
    ts.factory.createTypeLiteralNode(properties)
  );
};
