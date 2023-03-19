import ts, { createPrinter } from "typescript";

export const stringifyTsNode = (node: ts.Node) => {
  return createPrinter().printNode(
    ts.EmitHint.Unspecified,
    node,
    ts.factory.createSourceFile(
      [],
      ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
      ts.NodeFlags.None
    )
  );
};
