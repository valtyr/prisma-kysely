import type { GeneratorOptions } from "@prisma/generator-helper";
import generatorHelper from "@prisma/generator-helper";
import path from "node:path";

import packageJson from "../package.json" with { type: "json" };
import { GENERATOR_NAME } from "./constants.ts";
import { generateDatabaseType } from "./helpers/generateDatabaseType.ts";
import { type EnumType, generateEnumType } from "./helpers/generateEnumType.ts";
import { generateFiles } from "./helpers/generateFiles.ts";
import { generateImplicitManyToManyModels } from "./helpers/generateImplicitManyToManyModels.ts";
import { generateModel } from "./helpers/generateModel.ts";
import {
  convertToMultiSchemaModels,
  parseMultiSchemaMap,
} from "./helpers/multiSchemaHelpers.ts";
import { sorted } from "./utils/sorted.ts";
import { validateConfig } from "./utils/validateConfig.ts";
import { writeFileSafely } from "./utils/writeFileSafely.ts";

const { version } = packageJson;
const { generatorHandler } = generatorHelper;

generatorHandler({
  onManifest() {
    return {
      version,
      defaultOutput: "./generated",
      prettyName: GENERATOR_NAME,
    };
  },
  onGenerate: async (options: GeneratorOptions) => {
    if (!options.version) {
      throw new Error(
        `Could not determine Prisma version. ` +
          `Make sure you are using a recent version of Prisma.`
      );
    }

    const semverMatch = options.version.match(/^(\d+)\./);
    if (semverMatch && parseInt(semverMatch[1], 10) < 7) {
      throw new Error(
        `prisma-kysely v${version} requires Prisma 7 or later. ` +
          `You are using Prisma ${options.version}. ` +
          `Please upgrade Prisma or use prisma-kysely v2.x for Prisma 6.`
      );
    }

    // Parse the config
    const config = validateConfig({
      ...options.generator.config,
      databaseProvider: options.datasources[0].provider,
    });

    // Generate enum types
    let enums = options.dmmf.datamodel.enums
      .map(({ name, values }) => generateEnumType(name, values))
      .filter((e): e is EnumType => !!e);

    // Generate DMMF models for implicit many to many tables
    //
    // (I don't know why you would want to use implicit tables
    // with kysely, but hey, you do you)
    const implicitManyToManyModels = generateImplicitManyToManyModels(
      options.dmmf.datamodel.models
    );

    const hasMultiSchema = options.datasources.some(
      (d) => d.schemas.length > 0
    );

    const multiSchemaMap =
      config.groupBySchema || hasMultiSchema
        ? parseMultiSchemaMap(options.datamodel)
        : undefined;

    // Generate model types
    let models = sorted(
      [...options.dmmf.datamodel.models, ...implicitManyToManyModels],
      (a, b) => a.name.localeCompare(b.name)
    ).map((m) =>
      generateModel(m, config, {
        groupBySchema: config.groupBySchema,
        defaultSchema: config.defaultSchema,
        multiSchemaMap,
      })
    );

    // Extend model table names with schema names if using multi-schemas
    if (hasMultiSchema) {
      const filterBySchema = config.filterBySchema
        ? new Set(config.filterBySchema)
        : null;

      models = convertToMultiSchemaModels({
        models,
        groupBySchema: config.groupBySchema,
        defaultSchema: config.defaultSchema,
        filterBySchema,
        multiSchemaMap,
      });

      enums = convertToMultiSchemaModels({
        models: enums,
        groupBySchema: config.groupBySchema,
        defaultSchema: config.defaultSchema,
        filterBySchema,
        multiSchemaMap,
      });
    }

    // Generate the database type that ties it all together
    const databaseType = generateDatabaseType(models, config);

    // Parse it all into a string. Either 1 or 2 files depending on user config
    const files = generateFiles({
      databaseType,
      enumNames: options.dmmf.datamodel.enums.map((e) => e.name),
      models,
      enums,
      enumsOutfile: config.enumFileName,
      typesOutfile: config.fileName,
      groupBySchema: config.groupBySchema,
      defaultSchema: config.defaultSchema,
      importExtension: config.importExtension,
      exportWrappedTypes: config.exportWrappedTypes,
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
