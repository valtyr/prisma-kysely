import ts from "typescript";

type GenerateFieldArgs = {
  name: string;
  type: ts.TypeNode;
  nullable: boolean;
  generated: boolean;
  list: boolean;
  documentation?: string;
};
export const generateField = (args: GenerateFieldArgs) => {
  /*
   * I'm not totally sure in which order these should be applied when it comes
   * to lists. Is the whole list nullable or is each entry in the list nullable?
   * If you run into problems here please file an issue or create a pull request
   * with a fix and some proof please. Thank you :D
   */

  const { name, type, nullable, generated, list, documentation } = args;

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

  const propertySignature = ts.factory.createPropertySignature(
    undefined,
    ts.factory.createIdentifier(name),
    undefined,
    fieldType
  );

  if (documentation) {
    return ts.addSyntheticLeadingComment(
      propertySignature,
      ts.SyntaxKind.MultiLineCommentTrivia,
      // This is a bit hacky and I'm not sure if there's a better way to do this
      // while returning a PropertySignature type.
      // This methods results to: /*${documentation}*/
      // Which is clearly not a JSDoc comment. So to get around it, we add a
      // leading asterisk + surrounding spaces so the result is: /** ${documentation} */
      `* ${documentation} `,
      true
    );
  }

  return propertySignature;
};
