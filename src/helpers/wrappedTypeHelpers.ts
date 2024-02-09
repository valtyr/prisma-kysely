import ts from "typescript";

export const toTableTypeName = (modelName: string) => `${modelName}Table`;

/**
 * Convert to Kysely wrapped types.
 * e.g.) `Model` will be `ModelTable` (as-is), `Model` (Selectable), `NewModel` (Insertable), and `ModelUpdate` (Updateable).
 */
export const convertToWrappedTypes = (
  modelDefinitions: ts.TypeAliasDeclaration[]
): ts.TypeAliasDeclaration[] => {
  return modelDefinitions.flatMap((m) => {
    const modelName = m.name.text;
    const tableTypeName = toTableTypeName(modelName);
    return [
      { ...m, name: ts.factory.createIdentifier(tableTypeName) },
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
  });
};
