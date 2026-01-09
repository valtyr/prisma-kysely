import type { Config } from "./validateConfig.ts";
import { createCamelCaseMapper } from "./words.ts";

const snakeToCamel = createCamelCaseMapper();

export const normalizeCase = (name: string, config: Config) => {
  if (!config.camelCase) return name;
  return snakeToCamel(name);
};
