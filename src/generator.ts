import { GENERATOR_NAME } from "./constants";
import { generateDatabaseType } from "./helpers/generateDatabaseType";
import { generateFile } from "./helpers/generateFile";
import { generateImplicitManyToManyModels } from "./helpers/generateImplicitManyToManyModels";
import { generateModel } from "./helpers/generateModel";
import { generateStringLiteralUnion } from "./helpers/generateStringLiteralUnion";
import { generateTypedAliasDeclaration } from "./helpers/generateTypedAliasDeclaration";
import { sorted } from "./utils/sorted";
import { validateConfig } from "./utils/validateConfig";
import { writeFileSafely } from "./utils/writeFileSafely";
import type { GeneratorOptions } from "@prisma/generator-helper";
import { generatorHandler } from "@prisma/generator-helper";
import path from "path";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require("../package.json");

generatorHandler({
  onManifest() {
    return {
      version,
      defaultOutput: "./generated",
      prettyName: GENERATOR_NAME,
    };
  },
  onGenerate: async (options: GeneratorOptions) => {
    // Parse the config
    const config = validateConfig({
      ...options.generator.config,
      databaseProvider: options.datasources[0].provider,
    });

    // Generate enum types
    const enums = options.dmmf.datamodel.enums.flatMap(({ name, values }) => {
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
      options.dmmf.datamodel.models
    );

    // Generate model types
    const models = sorted(
      [...options.dmmf.datamodel.models, ...implicitManyToManyModels],
      (a, b) => a.name.localeCompare(b.name)
    ).map((m) => generateModel(m, config));

    // Generate the database type that ties it all together
    const databaseType = generateDatabaseType(
      models.map((m) => ({ tableName: m.tableName, typeName: m.typeName }))
    );

    // Print it all into a string
    const file = generateFile([
      ...enums,
      ...models.map((m) => m.definition),
      databaseType,
    ]);

    // And write it to a file!
    const writeLocation = path.join(
      options.generator.output?.value || "",
      config.fileName
    );
    await writeFileSafely(writeLocation, file);
  },
});
