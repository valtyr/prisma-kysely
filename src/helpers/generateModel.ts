import type { DMMF } from "@prisma/generator-helper";
import ts from "typescript";

import { generateField } from "./generateField.ts";
import { generateFieldType } from "./generateFieldType.ts";
import { generateTypeOverrideFromDocumentation } from "./generateTypeOverrideFromDocumentation.ts";
import { normalizeCase } from "../utils/normalizeCase.ts";
import type { Config } from "../utils/validateConfig.ts";
import { capitalize } from "../utils/words.ts";

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

export type GenerateModelOptions = {
  groupBySchema: boolean;
  defaultSchema: string;
  multiSchemaMap?: Map<string, string>;
};

export const generateModel = (
  model: DMMF.Model,
  config: Config,
  { defaultSchema, groupBySchema, multiSchemaMap }: GenerateModelOptions
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
      // Of the SQL providers prisma-kysely supports, only PostgreSQL and
      // CockroachDB allow arrays of enums (Prisma rejects them at schema
      // validation for mysql/sqlite/sqlserver), so an enum list can only
      // ever reach here on one of those two. Both speak the Postgres wire
      // protocol via the `pg` driver, which doesn't register a parser for
      // user-defined enum array types, so Kysely receives the raw Postgres
      // array literal string (e.g. `{FOO,BAR}`, or `{}` for an empty array)
      // rather than a parsed array. Typing it as `EnumType[]` would
      // therefore be wrong, so we fall back to `string`.
      // See https://github.com/valtyr/prisma-kysely/issues/107
      const isEnumArray = field.isList;

      return generateField({
        isId: field.isId,
        name: normalizeCase(dbName || field.name, config),
        type: isEnumArray
          ? ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
          : ts.factory.createTypeReferenceNode(
              ts.factory.createIdentifier(
                schemaPrefix && defaultSchema !== schemaPrefix
                  ? `${capitalize(schemaPrefix)}.${field.type}`
                  : field.type
              ),
              undefined
            ),
        nullable: !field.isRequired,
        generated: isGenerated,
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
