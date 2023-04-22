import ts from "typescript";

import { applyJSDocWorkaround } from "~/utils/applyJSDocWorkaround";
import isValidTSIdentifier from "~/utils/isValidTSIdentifier";

type GenerateFieldArgs = {
  name: string;
  type: ts.TypeNode;
  nullable: boolean;
  generated: boolean;
  list: boolean;
  documentation?: string;
};
export const generateField = (args: GenerateFieldArgs) => {
  const { name, type, nullable, generated, list, documentation } = args;

  /*
   * I'm not totally sure in which order these should be applied when it comes
   * to lists. Is the whole list nullable or is each entry in the list nullable?
   * If you run into problems here please file an issue or create a pull request
   * with a fix and some proof please. Thank you :D
   */

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

  const nameIdentifier = isValidTSIdentifier(name)
    ? ts.factory.createIdentifier(name)
    : ts.factory.createStringLiteral(name);

  const propertySignature = ts.factory.createPropertySignature(
    undefined,
    nameIdentifier,
    undefined,
    fieldType
  );

  if (documentation) {
    return ts.addSyntheticLeadingComment(
      propertySignature,
      ts.SyntaxKind.MultiLineCommentTrivia,
      applyJSDocWorkaround(documentation),
      true
    );
  }

  return propertySignature;
};
