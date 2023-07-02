import {
  type BlockAttribute,
  type Model,
  getSchema,
} from "@mrleebo/prisma-ast";

type ModelLike = {
  typeName: string;
  tableName: string;
};

/**
 * Appends schema names to the table names of models.
 *
 * Prisma supports multi-schema databases, but currently doens't include the schema name in the DMMT output.
 * As a workaround, this function parses the schema separately and matches the schema to the model name.
 *
 * TODO: Remove this when @prisma/generator-helper exposes schema names in the models by default.
 *       See thread: https://github.com/prisma/prisma/issues/19987
 *
 * @param models list of model names
 * @param dataModelStr the full datamodel string (schema.prisma contents)
 * @returns list of models with schema names appended to the table names ("schema.table")
 */
export const convertToMultiSchemaModels = <T extends ModelLike>(
  models: T[],
  dataModelStr: string
): T[] => {
  const parsedSchema = getSchema(dataModelStr);

  const multiSchemaMap = new Map(
    parsedSchema.list
      .filter((block): block is Model => block.type === "model")
      .map((model) => {
        const schemaProperty = model.properties.find(
          (prop): prop is BlockAttribute =>
            prop.type === "attribute" && prop.name === "schema"
        );

        const schemaName = schemaProperty?.args?.[0].value;

        if (typeof schemaName !== "string") {
          return [model.name, ""];
        }

        return [model.name, schemaName.replace(/"/g, "")];
      })
  );

  return models.map((model) => {
    const schemaName = multiSchemaMap.get(model.typeName);

    if (!schemaName) {
      return model;
    }

    return { ...model, tableName: `${schemaName}.${model.tableName}` };
  });
};
