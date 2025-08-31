import type { Config } from "~/utils/validateConfig";
import { createCamelCaseMapper } from "~/utils/words";

const snakeToCamel = createCamelCaseMapper();

export const normalizeCase = (name: string, config: Config) => {
  if (!config.camelCase) return name;
  return snakeToCamel(name);
};
