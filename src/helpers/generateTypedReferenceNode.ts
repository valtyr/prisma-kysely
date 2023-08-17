import ts from "typescript";

export const generateTypedReferenceNode = (name: string) => {
  return ts.factory.createTypeAliasDeclaration(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    name,
    undefined,
    ts.factory.createTypeReferenceNode(
      `(typeof ${name})[keyof typeof ${name}]`,
      undefined
    )
  );
};
