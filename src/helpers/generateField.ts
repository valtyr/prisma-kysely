import ts from "typescript";

export const generateField = (
  name: string,
  type: ts.TypeNode,
  nullable: boolean,
  generated: boolean,
  list: boolean
) => {
  let fieldType = type;

  if (nullable)
    fieldType = ts.factory.createUnionTypeNode([
      fieldType,
      ts.factory.createLiteralTypeNode(
        ts.factory.createToken(ts.SyntaxKind.NullKeyword)
      ),
    ]);

  if (generated)
    fieldType = ts.factory.createTypeReferenceNode(
      ts.factory.createIdentifier("Generated"),
      [fieldType]
    );

  if (list) fieldType = ts.factory.createArrayTypeNode(fieldType);

  return ts.factory.createPropertySignature(
    undefined,
    ts.factory.createIdentifier(name),
    undefined,
    fieldType
  );
};
