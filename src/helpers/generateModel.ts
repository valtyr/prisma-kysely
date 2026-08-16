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
  referencedSchemas: string[];
  referencedSchemaTypes: { schema: string; typeName: string }[];
  schema?: string;
};

export type GenerateModelOptions = {
  schemaGrouping: "none" | "namespace" | "exports";
  defaultSchema: string;
  multiSchemaMap?: Map<string, string>;
};

/**
 * Generates a Kysely table type and records schema references needed by split-file output.
 */
export const generateModel = (
  model: DMMF.Model,
  config: Config,
  { defaultSchema, schemaGrouping, multiSchemaMap }: GenerateModelOptions
): ModelType => {
  const referencedSchemas = new Set<string>();
  const referencedSchemaTypes = new Map<
    string,
    { schema: string; typeName: string }
  >();
  const modelSchema = multiSchemaMap?.get(model.name) || defaultSchema;

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

    const fieldSchema = multiSchemaMap?.get(field.type);
    const schemaPrefix =
      schemaGrouping !== "none" && fieldSchema !== undefined
        ? fieldSchema || defaultSchema
        : false;

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
      //
      // Apps that do get real arrays back (registered enum-array type
      // parsers, `to_json` in queries, etc.) can opt out per field with
      // a `/// @kyselyType(EnumType[])` annotation, which replaces the
      // type wholesale.
      const isEnumArray = field.isList;
      const enumType = ts.factory.createTypeReferenceNode(
        ts.factory.createIdentifier(
          schemaPrefix &&
            defaultSchema !== schemaPrefix &&
            (schemaGrouping === "namespace" || schemaPrefix !== modelSchema)
            ? `${capitalize(schemaPrefix)}.${field.type}`
            : field.type
        ),
        undefined
      );

      // Track cross-schema enum references for split-file output. A plain
      // `string` enum array references nothing; an annotated one may name
      // the enum (e.g. `World.Ability[]`), so keep the import available.
      if ((!isEnumArray || typeOverride) && schemaPrefix) {
        if (defaultSchema !== schemaPrefix) {
          referencedSchemas.add(schemaPrefix);
        }

        referencedSchemaTypes.set(`${schemaPrefix}.${field.type}`, {
          schema: schemaPrefix,
          typeName: field.type,
        });
      }

      return generateField({
        isId: field.isId,
        name: normalizeCase(dbName || field.name, config),
        type: typeOverride
          ? ts.factory.createTypeReferenceNode(
              ts.factory.createIdentifier(typeOverride),
              undefined
            )
          : isEnumArray
            ? ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
            : enumType,
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
    referencedSchemas: [...referencedSchemas],
    referencedSchemaTypes: [...referencedSchemaTypes.values()],
    definition: ts.factory.createTypeAliasDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      ts.factory.createIdentifier(model.name),
      undefined,
      ts.factory.createTypeLiteralNode(properties)
    ),
  };
};
