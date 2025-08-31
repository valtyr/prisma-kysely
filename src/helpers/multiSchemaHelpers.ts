import { type BlockAttribute, getSchema } from "@mrleebo/prisma-ast";
import ts from "typescript";

import { capitalize } from "~/utils/words";

type ModelLike = {
  typeName: string;
  tableName?: string;
  schema?: string;
};

export type ConvertToMultiSchemaModelsOptions<T> = {
  models: T[];
  groupBySchema: boolean;
  defaultSchema: string;
  filterBySchema: Set<string> | null;
  multiSchemaMap?: Map<string, string>;
};

/**
 * Appends schema names to the table names of models.
 *
 * @param models list of model names
 * @param multiSchemaMap map of model names to schema names
 * @param groupBySchema whether to group models by schema
 * @param filterBySchema set of schema names to filter by. Use `null` to disable filtering.
 * @returns list of models with schema names appended to the table names ("schema.table")
 */
export const convertToMultiSchemaModels = <const T extends ModelLike>({
  defaultSchema,
  filterBySchema,
  groupBySchema,
  models,
  multiSchemaMap,
}: ConvertToMultiSchemaModelsOptions<T>): T[] => {
  return models.flatMap((model) => {
    const schemaName = multiSchemaMap?.get(model.typeName);

    if (!schemaName) {
      return model;
    }

    // Filter out models that don't match the schema filter
    if (filterBySchema && !filterBySchema.has(schemaName)) {
      return [];
    }

    // If the schema is the default schema, we don't need to modify the model
    if (schemaName === defaultSchema) {
      return model;
    }

    return [
      {
        ...model,
        typeName: groupBySchema
          ? `${capitalize(schemaName)}.${model.typeName}`
          : model.typeName,
        tableName: model.tableName
          ? `${schemaName}.${model.tableName}`
          : undefined,
        schema: groupBySchema ? schemaName : undefined,
      },
    ];
  });
};

// https://github.com/microsoft/TypeScript/blob/a53c37d59aa0c20f566dec7e5498f05afe45dc6b/src/compiler/scanner.ts#L985
const isIdentifierText: (
  name: string,
  languageVersion?: ts.ScriptTarget | undefined,
  identifierVariant?: ts.LanguageVariant
) => boolean =
  // @ts-expect-error - Internal TS API
  ts.isIdentifierText;

/**
 * Parses a data model string and returns a map of model names to schema names.
 *
 * Prisma supports multi-schema databases, but currently doens't include the schema name in the DMMT output.
 * As a workaround, this function parses the schema separately and matches the schema to the model name.
 *
 * TODO: Remove this when @prisma/generator-helper exposes schema names in the models by default.
 *       See thread: https://github.com/prisma/prisma/issues/19987
 *
 * @param dataModelStr the full datamodel string (schema.prisma contents)
 * @returns a map of model names to schema names
 */
export function parseMultiSchemaMap(dataModelStr: string) {
  const parsedSchema = getSchema(dataModelStr);
  const multiSchemaMap = new Map<string, string>();

  for (const block of parsedSchema.list) {
    if (
      // Model
      block.type !== "model" &&
      block.type !== "view" &&
      block.type !== "type" &&
      // Enum
      block.type !== "enum"
    ) {
      continue;
    }

    const properties =
      block.type === "enum" ? block.enumerators : block.properties;

    const schemaProperty = properties.find(
      (prop): prop is BlockAttribute =>
        prop.type === "attribute" && prop.name === "schema"
    );

    const schemaName = schemaProperty?.args?.[0].value;

    if (typeof schemaName !== "string") {
      multiSchemaMap.set(block.name, "");
    } else {
      const schema: string = JSON.parse(schemaName).toString();

      if (isIdentifierText && !isIdentifierText(schema)) {
        throw new Error(
          `Cannot generate identifier for schema "${schema}" in model "${block.name}" because it is not a valid Identifier, please disable \`groupBySchema\` or rename it.`
        );
      }

      // don't capitalize it here because the DB key is case-sensitive
      multiSchemaMap.set(block.name, schema);
    }
  }

  return multiSchemaMap;
}
