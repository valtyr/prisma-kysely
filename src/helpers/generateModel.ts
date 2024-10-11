import type { DMMF } from "@prisma/generator-helper";
import ts from "typescript";

import { generateField } from "~/helpers/generateField";
import { generateFieldType } from "~/helpers/generateFieldType";
import { generateTypeOverrideFromDocumentation } from "~/helpers/generateTypeOverrideFromDocumentation";
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

    const typeOverride = field.documentation
      ? generateTypeOverrideFromDocumentation(field.documentation)
      : null;

    if (field.kind === "object" || field.kind === "unsupported") return [];

    const dbName = typeof field.dbName === "string" ? field.dbName : null;

    if (field.kind === "enum") {
      const type = field.isList
        ? ts.factory.createTypeReferenceNode(
            ts.factory.createIdentifier("EnumArray"),
            [
              ts.factory.createTypeReferenceNode(
                ts.factory.createIdentifier(field.type),
                undefined
              ),
            ]
          )
        : ts.factory.createTypeReferenceNode(
            ts.factory.createIdentifier(field.type),
            undefined
          );

      return generateField({
        isId: field.isId,
        name: normalizeCase(dbName || field.name, config),
        type,
        nullable: !field.isRequired,
        generated: isGenerated,
        // Enum list values are handled as strings, so we don't need to wrap them in a list
        list: false,
        documentation: field.documentation,
        config,
      });
    }

    return generateField({
      name: normalizeCase(dbName || field.name, config),
      type: ts.factory.createTypeReferenceNode(
        ts.factory.createIdentifier(
          generateFieldType(field.type, config, typeOverride)
        ),
        undefined
      ),
      nullable: !field.isRequired,
      generated: isGenerated,
      list: field.isList,
      documentation: field.documentation,
      isId: field.isId,
      config,
    });
  });

  return {
    typeName: model.name,
    tableName: model.dbName || model.name,
    definition: ts.factory.createTypeAliasDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      ts.factory.createIdentifier(model.name),
      undefined,
      ts.factory.createTypeLiteralNode(properties)
    ),
  };
};
