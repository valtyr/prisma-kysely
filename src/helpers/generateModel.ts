import type { DMMF } from "@prisma/generator-helper";
import ts from "typescript";

import { generateField } from "~/helpers/generateField";
import { generateFieldType } from "~/helpers/generateFieldType";
import { generateTypeOverrideFromDocumentation } from "~/helpers/generateTypeOverrideFromDocumentation";
import { normalizeCase } from "~/utils/normalizeCase";
import type { Config } from "~/utils/validateConfig";
import { capitalize } from "~/utils/words";

/**
 * Some of Prisma's default values are implemented in
 * JS. These should therefore not be annotated as Generated.
 * See https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#attribute-functions.
 */
const defaultTypesImplementedInJS = ["cuid", "uuid"];

export type ModelType = {
  typeName: string;
  tableName: string;
  definition: ts.TypeAliasDeclaration;
  schema?: string;
};

export const generateModel = (
  model: DMMF.Model,
  config: Config,
  groupBySchema: boolean,
  multiSchemaMap?: Map<string, string>
): ModelType => {
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

    const schemaPrefix = groupBySchema && multiSchemaMap?.get(field.type);

    if (field.kind === "enum") {
      return generateField({
        isId: field.isId,
        name: normalizeCase(dbName || field.name, config),
        type: ts.factory.createTypeReferenceNode(
          ts.factory.createIdentifier(
            schemaPrefix
              ? `${capitalize(schemaPrefix)}.${field.type}`
              : field.type
          ),
          undefined
        ),
        nullable: !field.isRequired,
        generated: isGenerated,
        list: field.isList,
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
