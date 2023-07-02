import type { GeneratorOptions } from "@prisma/generator-helper";
import { generatorHandler } from "@prisma/generator-helper";
import path from "path";

import { GENERATOR_NAME } from "~/constants";
import { generateDatabaseType } from "~/helpers/generateDatabaseType";
import { generateFiles } from "~/helpers/generateFiles";
import { generateImplicitManyToManyModels } from "~/helpers/generateImplicitManyToManyModels";
import { generateModel } from "~/helpers/generateModel";
import { sorted } from "~/utils/sorted";
import { validateConfig } from "~/utils/validateConfig";
import { writeFileSafely } from "~/utils/writeFileSafely";

import { generateEnumType } from "./helpers/generateEnumType";
import { convertToMultiSchemaModels } from "./helpers/multiSchemaHelpers";

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
      return generateEnumType(name, values);
    });

    // Generate DMMF models for implicit many to many tables
    //
    // (I don't know why you would want to use implicit tables
    // with kysely, but hey, you do you)
    const implicitManyToManyModels = generateImplicitManyToManyModels(
      options.dmmf.datamodel.models
    );

    // Generate model types
    let models = sorted(
      [...options.dmmf.datamodel.models, ...implicitManyToManyModels],
      (a, b) => a.name.localeCompare(b.name)
    ).map((m) => generateModel(m, config));

    // Extend model table names with schema names if using multi-schemas
    if (options.generator.previewFeatures?.includes("multiSchema")) {
      models = convertToMultiSchemaModels(models, options.datamodel);
    }

    // Generate the database type that ties it all together
    const databaseType = generateDatabaseType(
      models.map((m) => ({ tableName: m.tableName, typeName: m.typeName })),
      config
    );

    // Parse it all into a string. Either 1 or 2 files depending on user config
    const files = generateFiles({
      databaseType,
      modelDefinitions: models.map((m) => m.definition),
      enumNames: options.dmmf.datamodel.enums.map((e) => e.name),
      enums,
      enumsOutfile: config.enumFileName,
      typesOutfile: config.fileName,
    });

    // And write it to a file!
    await Promise.allSettled(
      files.map(({ filepath, content }) => {
        const writeLocation = path.join(
          options.generator.output?.value || "",
          filepath
        );
        return writeFileSafely(writeLocation, content);
      })
    );
  },
});
