import ts from "typescript";

export const toTableTypeName = (modelName: string) => `${modelName}Table`;

/**
 * Convert to Kysely wrapped types.
 * e.g.) `Model` will be `ModelTable` (as-is), `Model` (Selectable), `NewModel` (Insertable), and `ModelUpdate` (Updateable).
 */
export const convertToWrappedTypes = (
  modelDefinition: ts.TypeAliasDeclaration
): ts.TypeAliasDeclaration[] => {
  const modelName = modelDefinition.name.text;
  const tableTypeName = toTableTypeName(modelName);
  return [
    { ...modelDefinition, name: ts.factory.createIdentifier(tableTypeName) },
    ts.factory.createTypeAliasDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      ts.factory.createIdentifier(modelName),
      undefined,
      ts.factory.createTypeReferenceNode("Selectable", [
        ts.factory.createTypeReferenceNode(tableTypeName, undefined),
      ])
    ),
    ts.factory.createTypeAliasDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      ts.factory.createIdentifier(`New${modelName}`),
      undefined,
      ts.factory.createTypeReferenceNode("Insertable", [
        ts.factory.createTypeReferenceNode(tableTypeName, undefined),
      ])
    ),
    ts.factory.createTypeAliasDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      ts.factory.createIdentifier(`${modelName}Update`),
      undefined,
      ts.factory.createTypeReferenceNode("Updateable", [
        ts.factory.createTypeReferenceNode(tableTypeName, undefined),
      ])
    ),
  ];
};
