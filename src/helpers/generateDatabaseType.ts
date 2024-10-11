import ts from "typescript";

import type { ModelType } from "~/helpers/generateModel";
import isValidTSIdentifier from "~/utils/isValidTSIdentifier";
import { normalizeCase } from "~/utils/normalizeCase";
import { sorted } from "~/utils/sorted";
import type { Config } from "~/utils/validateConfig";

export const generateDatabaseType = (
  models: Pick<ModelType, "tableName" | "typeName">[],
  config: Config
) => {
  const sortedModels = sorted(models, (a, b) =>
    a.tableName.localeCompare(b.tableName)
  );

  const properties = sortedModels.map((field) => {
    const caseNormalizedTableName = normalizeCase(field.tableName, config);

    /*
     * If the table name isn't a valid typescript identifier we need
     * to wrap it with quotes
     */
    const nameIdentifier = isValidTSIdentifier(caseNormalizedTableName)
      ? ts.factory.createIdentifier(caseNormalizedTableName)
      : ts.factory.createStringLiteral(caseNormalizedTableName);

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
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier("DB"),
    undefined,
    ts.factory.createTypeLiteralNode(properties)
  );
};
