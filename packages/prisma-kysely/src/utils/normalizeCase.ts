import { createCamelCaseMapper } from "~/utils/camelCase";
import type { Config } from "~/utils/validateConfig";

const snakeToCamel = createCamelCaseMapper();

export const normalizeCase = (name: string, config: Config) => {
  if (!config.camelCase) return name;
  return snakeToCamel(name);
};
