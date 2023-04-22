import type { DMMF } from "@prisma/generator-helper";
import ts from "typescript";

import { generateField } from "~/helpers/generateField";
import { generateFieldType } from "~/helpers/generateFieldType";
import { normalizeCase } from "~/utils/normalizeCase";
import type { Config } from "~/utils/validateConfig";

/**
 * Some of Prisma's default values are implemented in
 * JS. These should therefore not be annotated as Generated.
 * See https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#attribute-functions.
 */
const defaultTypesImplementedInJS = ["cuid", "uuid"];

export const generateModel = (model: DMMF.Model, config: Config) => {
  const properties = model.fields.flatMap((field) => {
    const isGenerated =
      field.hasDefaultValue &&
      !(
        typeof field.default === "object" &&
        "name" in field.default &&
        defaultTypesImplementedInJS.includes(field.default.name)
      );

    if (field.kind === "object" || field.kind === "unsupported") return [];
    if (field.kind === "enum") {
      return generateField({
        name: field.name,
        type: ts.factory.createTypeReferenceNode(
          ts.factory.createIdentifier(field.type),
          undefined
        ),
        nullable: !field.isRequired,
        generated: isGenerated,
        list: field.isList,
        documentation: field.documentation,
      });
    }
    const dbName = typeof field.dbName === "string" ? field.dbName : null;

    return generateField({
      name: normalizeCase(dbName || field.name, config),
      type: ts.factory.createTypeReferenceNode(
        ts.factory.createIdentifier(generateFieldType(field.type, config)),
        undefined
      ),
      nullable: !field.isRequired,
      generated: isGenerated,
      list: field.isList,
      documentation: field.documentation,
    });
  });

  return {
    typeName: model.name,
    tableName: model.dbName || model.name,
    definition: ts.factory.createTypeAliasDeclaration(
      undefined,
      [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      ts.factory.createIdentifier(model.name),
      undefined,
      ts.factory.createTypeLiteralNode(properties)
    ),
  };
};
