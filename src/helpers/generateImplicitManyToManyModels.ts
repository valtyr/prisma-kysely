import type { DMMF } from "@prisma/generator-helper";

import { sorted } from "~/utils/sorted";

/*

Credit where credit is due:

This is heavily borrowed from prisma-dbml-generator
https://github.com/notiz-dev/prisma-dbml-generator/blob/752f89cf40257a9698913294b38843ac742f8345/src/generator/many-to-many-tables.ts

*/

export const getModelByType = (
  models: DMMF.Model[],
  type: string
): DMMF.Model | undefined => {
  return models.find((model) => model.name === type);
};

export function generateImplicitManyToManyModels(
  models: DMMF.Model[]
): DMMF.Model[] {
  const manyToManyFields = filterManyToManyRelationFields(models);

  if (manyToManyFields.length === 0) {
    return [];
  }
  return generateModels(manyToManyFields, models, []);
}

function generateModels(
  manyToManyFields: DMMF.Field[],
  models: DMMF.Model[],
  manyToManyTables: DMMF.Model[] = []
): DMMF.Model[] {
  const manyFirst = manyToManyFields.shift();
  if (!manyFirst) {
    return manyToManyTables;
  }

  const manySecond = manyToManyFields.find(
    (field) => field.relationName === manyFirst.relationName
  );

  if (!manySecond) {
    return manyToManyTables;
  }

  manyToManyTables.push({
    dbName: `_${manyFirst.relationName}`,
    name: manyFirst.relationName || "",
    primaryKey: null,
    uniqueFields: [],
    uniqueIndexes: [],
    fields: generateJoinFields([manyFirst, manySecond], models),
  });

  return generateModels(
    manyToManyFields.filter(
      (field) => field.relationName !== manyFirst.relationName
    ),
    models,
    manyToManyTables
  );
}

function generateJoinFields(
  fields: [DMMF.Field, DMMF.Field],
  models: DMMF.Model[]
): DMMF.Field[] {
  if (fields.length !== 2) throw new Error("Huh?");

  const sortedFields = sorted(fields, (a, b) => a.name.localeCompare(b.name));
  const A = sortedFields[0];
  const B = sortedFields[1];

  return [
    {
      name: "A",
      type: getJoinIdType(A, models),
      kind: "scalar",
      isRequired: true,
      isList: false,
      isUnique: false,
      isId: false,
      isReadOnly: true,
      hasDefaultValue: false,
    },
    {
      name: "B",
      type: getJoinIdType(B, models),
      kind: "scalar",
      isRequired: true,
      isList: false,
      isUnique: false,
      isId: false,
      isReadOnly: true,
      hasDefaultValue: false,
    },
  ];
}

function getJoinIdType(joinField: DMMF.Field, models: DMMF.Model[]): string {
  const joinedModel = models.find((m) => m.name === joinField.type);
  if (!joinedModel) throw new Error("Could not find referenced model");

  const idField = joinedModel.fields.find((f) => f.isId);
  if (!idField) throw new Error("No ID field on referenced model");

  return idField.type;
}

function filterManyToManyRelationFields(models: DMMF.Model[]): DMMF.Field[] {
  return models
    .map((model) =>
      model.fields
        .filter(
          (field) =>
            field.relationName &&
            field.isList &&
            field.relationFromFields?.length === 0 &&
            field.relationToFields?.length === 0
        )
        .map((field) => field)
    )
    .flat();
}
