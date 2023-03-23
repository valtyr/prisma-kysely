import { createCamelCaseMapper } from "./camelCase";
import type { Config } from "./validateConfig";

const snakeToCamel = createCamelCaseMapper();

export const normalizeCase = (name: string, config: Config) => {
  if (!config.camelCase) return name;
  return snakeToCamel(name);
};
