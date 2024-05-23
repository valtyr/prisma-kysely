import {
  type BlockAttribute,
  type Enum,
  type Model,
  getSchema,
} from "@mrleebo/prisma-ast";

type ModelLike = {
  typeName: string;
  tableName: string;
};

/**
 * Matches model/enum names to schema names.
 *
 * Prisma supports multi-schema databases, but currently doens't include the schema name in the DMMT output.
 * As a workaround, this function parses the schema separately and matches the schema to the model/enum name.
 *
 * TODO: Remove this when @prisma/generator-helper exposes schema names in the models/enums by default.
 *       See thread: https://github.com/prisma/prisma/issues/19987
 *
 * @param dataModelStr the full datamodel string (schema.prisma contents)
 * @returns map of model/enum names to schema names
 */
export const buildMultiSchemaMap = (dataModelStr: string) => {
  const parsedSchema = getSchema(dataModelStr);

  return new Map(
    parsedSchema.list
      .filter(
        (block): block is Model | Enum =>
          block.type === "model" || block.type === "enum"
      )
      .map((block) => {
        const schemaProperty = (
          block.type === "model" ? block.properties : block.enumerators
        ).find(
          (prop): prop is BlockAttribute =>
            prop.type === "attribute" && prop.name === "schema"
        );

        const schemaName = schemaProperty?.args?.[0].value;

        if (typeof schemaName !== "string") {
          return [block.name, ""];
        }

        return [block.name, schemaName.replace(/"/g, "")];
      })
  );
};

/**
 * Appends schema names to the table names of models.
 *
 * @param multiSchemaMap map of model names to schema names
 * @param models list of model names
 */
export const convertToMultiSchemaModels = <T extends ModelLike>(
  multiSchemaMap: Map<string, string>,
  models: T[]
): T[] => {
  return models.map((model) => {
    const schemaName = multiSchemaMap.get(model.typeName);

    if (!schemaName) {
      return model;
    }

    return { ...model, tableName: `${schemaName}.${model.tableName}` };
  });
};
