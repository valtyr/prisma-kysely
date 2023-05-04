import type { GeneratorOptions } from "@prisma/generator-helper";
import { generatorHandler } from "@prisma/generator-helper";
import path from "path";

import { GENERATOR_NAME } from "~/constants";
import { generateTSFromDMMF } from "~/helpers/generateTSFromDMMF";
import { validateConfig } from "~/utils/validateConfig";
import { writeFileSafely } from "~/utils/writeFileSafely";

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

    // Generate code
    const file = generateTSFromDMMF(options.dmmf, config);

    // And write it to a file!
    const writeLocation = path.join(
      options.generator.output?.value || "",
      config.fileName
    );
    await writeFileSafely(writeLocation, file);
  },
});
