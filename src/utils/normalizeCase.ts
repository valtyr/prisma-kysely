import type { Config } from "./validateConfig";
import { createCamelCaseMapper } from "kysely/dist/cjs/plugin/camel-case/camel-case";

const snakeToCamel = createCamelCaseMapper();

export const normalizeCase = (name: string, config: Config) => {
  if (!config.camelCase) return name;
  return snakeToCamel(name);
};
