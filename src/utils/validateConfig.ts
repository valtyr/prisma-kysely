import prismaInternals from "@prisma/internals";
import z from "zod";

const { logger } = prismaInternals;

export enum GroupBySchema {
  None,
  Namespace,
  Module,
}

const booleanStringLiteral = z
  .union([z.boolean(), z.literal("true"), z.literal("false")])
  .transform((arg) => {
    if (typeof arg === "boolean") return arg;
    return arg === "true";
  });

export const configValidator = z
  .object({
    // Meta information (not provided through user input)
    databaseProvider: z.union([
      z.literal("postgresql"),
      z.literal("cockroachdb"),
      z.literal("mysql"),
      z.literal("sqlite"),
      z.literal("sqlserver"),
    ]),

    // Output overrides
    fileName: z.string().optional().default("types.ts"),
    importExtension: z.string().default(""),
    enumFileName: z.string().optional(),

    // Typescript type overrides
    stringTypeOverride: z.string().optional(),
    booleanTypeOverride: z.string().optional(),
    intTypeOverride: z.string().optional(),
    bigIntTypeOverride: z.string().optional(),
    floatTypeOverride: z.string().optional(),
    decimalTypeOverride: z.string().optional(),
    dateTimeTypeOverride: z.string().optional(),
    jsonTypeOverride: z.string().optional(),
    bytesTypeOverride: z.string().optional(),
    unsupportedTypeOverride: z.string().optional(),

    // The DB type name to use in the generated types.
    dbTypeName: z.string().default("DB"),

    // Support the Kysely camel case plugin
    camelCase: booleanStringLiteral.default(false),

    // Use GeneratedAlways for IDs instead of Generated
    readOnlyIds: booleanStringLiteral.default(false),

    // Group models and enums by their schema when using multiSchema.
    // `true` emits a TypeScript namespace per schema in a single file,
    // `"module"` emits one file per schema next to an index.
    groupBySchema: z
      .union([booleanStringLiteral, z.literal("module")])
      .default(false)
      .transform((value) => {
        if (value === "module") return GroupBySchema.Module;
        else if (value === true) return GroupBySchema.Namespace;
        else return GroupBySchema.None;
      }),

    // Which schema should not be grouped
    defaultSchema: z.string().default("public"),

    // Group models in a namespace by their schema. Cannot be defined if enumFileName is defined.
    filterBySchema: z.array(z.string()).optional(),

    // Export Kysely wrapped types such as `Selectable<Model>`
    exportWrappedTypes: booleanStringLiteral.default(false),

    // Content to prepend to the start of the generated file(s). Useful for custom imports, pragmas, or comments.
    banner: z.string().optional(),
  })
  .strict()
  .transform((config) => {
    if (!config.enumFileName) {
      config.enumFileName = config.fileName;
    }

    if (
      config.groupBySchema !== GroupBySchema.None &&
      config.enumFileName !== config.fileName
    ) {
      // Grouped output places each enum with its schema (inside the namespace,
      // or in the schema's file), so a separate enum file isn't supported.
      throw new Error("groupBySchema is not compatible with enumFileName");
    }

    // enumFileName is always set at this point (defaulted from fileName above).
    return config as typeof config & { enumFileName: string };
  });

export type Config = z.infer<typeof configValidator>;

export const validateConfig = (config: unknown) => {
  const parsed = configValidator.safeParse(config);
  if (!parsed.success) {
    logger.error("Invalid prisma-kysely config");
    Object.entries(parsed.error.flatten().fieldErrors).forEach(
      ([key, value]) => {
        logger.error(`${key}: ${value.join(", ")}`);
      }
    );
    Object.values(parsed.error.flatten().formErrors).forEach((value) => {
      logger.error(`${value}`);
    });

    process.exit(1);
  }
  return parsed.data;
};
