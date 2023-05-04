import ts from "typescript";

export const generateStringLiteralUnion = (stringLiterals: string[]) => {
  if (stringLiterals.length === 0) return null;
  if (stringLiterals.length === 1)
    return ts.factory.createLiteralTypeNode(
      ts.factory.createStringLiteral(stringLiterals[0])
    );
  return ts.factory.createUnionTypeNode(
    stringLiterals.map((literal) =>
      ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(literal))
    )
  );
};
