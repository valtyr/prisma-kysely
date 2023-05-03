import type { DMMF } from "@prisma/generator-helper";

import { generateDatabaseType } from "~/helpers/generateDatabaseType";
import { generateFile } from "~/helpers/generateFile";
import { generateImplicitManyToManyModels } from "~/helpers/generateImplicitManyToManyModels";
import { generateModel } from "~/helpers/generateModel";
import { generateStringLiteralUnion } from "~/helpers/generateStringLiteralUnion";
import { generateTypedAliasDeclaration } from "~/helpers/generateTypedAliasDeclaration";
import { sorted } from "~/utils/sorted";
import type { Config } from "~/utils/validateConfig";

export const generateTSFromDMMF = (dmmf: DMMF.Document, config: Config) => {
  // Generate enum types
  const enums = dmmf.datamodel.enums.flatMap(({ name, values }) => {
    const type = generateStringLiteralUnion(values.map((v) => v.name));
    if (!type) return [];

    const declaration = generateTypedAliasDeclaration(name, type);
    return declaration;
  });

  // Generate DMMF models for implicit many to many tables
  //
  // (I don't know why you would want to use implicit tables
  // with kysely, but hey, you do you)
  const implicitManyToManyModels = generateImplicitManyToManyModels(
    dmmf.datamodel.models
  );

  // Generate model types
  const models = sorted(
    [...dmmf.datamodel.models, ...implicitManyToManyModels],
    (a, b) => a.name.localeCompare(b.name)
  ).map((m) => generateModel(m, config));

  // Generate the database type that ties it all together
  const databaseType = generateDatabaseType(
    models.map((m) => ({ tableName: m.tableName, typeName: m.typeName })),
    config
  );

  // Print it all into a string
  const file = generateFile([
    ...enums,
    ...models.map((m) => m.definition),
    databaseType,
  ]);

  return file;
};
