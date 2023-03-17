import isValidTSIdentifier from "../utils/isValidTSIdentifier";
import ts from "typescript";

export const generateDatabaseType = (
  models: { tableName: string; typeName: string }[]
) => {
  const properties = models.map((field) => {
    /*
     * If the table name isn't a valid typescript identifier we need
     * to wrap it with quotes
     */
    const nameIdentifier = isValidTSIdentifier(field.tableName)
      ? ts.factory.createIdentifier(field.tableName)
      : ts.factory.createStringLiteral(field.tableName);

    return ts.factory.createPropertySignature(
      undefined,
      nameIdentifier,
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
