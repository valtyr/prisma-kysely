import { logger } from "@prisma/internals";
import z from "zod";

export const configValidator = z
  .object({
    // Meta information (not provided through user input)
    databaseProvider: z.union([
      z.literal("postgresql"),
      z.literal("cockroachdb"),
      z.literal("mysql"),
      z.literal("sqlite"),
    ]),

    // Output overrides
    fileName: z.string().optional().default("types.ts"),

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

    // Support the Kysely camel case plugin
    camelCase: z
      .union([z.boolean(), z.literal("true"), z.literal("false")])
      .transform((arg) => {
        if (typeof arg === "boolean") return arg;
        return arg === "true";
      })
      .default(false),
  })
  .strict();

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
