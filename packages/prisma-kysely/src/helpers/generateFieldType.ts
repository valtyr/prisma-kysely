import type { Config } from "~/utils/validateConfig";

type TypeName =
  | "BigInt"
  | "Boolean"
  | "Bytes"
  | "DateTime"
  | "Decimal"
  | "Float"
  | "Int"
  | "Json"
  | "String"
  | "Unsupported";

type TypeMap = Partial<Record<TypeName, string>> & { [x: string]: string };

export const sqliteTypeMap: TypeMap = {
  BigInt: "number",
  Boolean: "number",
  Bytes: "Buffer",
  DateTime: "string",
  Decimal: "number",
  Float: "number",
  Int: "number",
  String: "string",
  Unsupported: "unknown",
};

export const mysqlTypeMap: TypeMap = {
  BigInt: "number",
  Boolean: "number",
  Bytes: "Buffer",
  DateTime: "Timestamp",
  Decimal: "string",
  Float: "number",
  Int: "number",
  Json: "unknown",
  String: "string",
  Unsupported: "unknown",
};

export const postgresqlTypeMap: TypeMap = {
  BigInt: "string",
  Boolean: "boolean",
  Bytes: "Buffer",
  DateTime: "Timestamp",
  Decimal: "string",
  Float: "number",
  Int: "number",
  Json: "unknown",
  String: "string",
  Unsupported: "unknown",
};

export const overrideType = (type: string, config: Config) => {
  switch (type) {
    case "String":
      return config.stringTypeOverride;
    case "DateTime":
      return config.dateTimeTypeOverride;
    case "Boolean":
      return config.booleanTypeOverride;
    case "BigInt":
      return config.bigIntTypeOverride;
    case "Int":
      return config.intTypeOverride;
    case "Float":
      return config.floatTypeOverride;
    case "Decimal":
      return config.decimalTypeOverride;
    case "Bytes":
      return config.bytesTypeOverride;
    case "Json":
      return config.jsonTypeOverride;
    case "Unsupported":
      return config.unsupportedTypeOverride;
  }
};

export const generateFieldTypeInner = (type: string, config: Config) => {
  switch (config.databaseProvider) {
    case "sqlite":
      return overrideType(type, config) || sqliteTypeMap[type];
    case "mysql":
      return overrideType(type, config) || mysqlTypeMap[type];
    case "postgresql":
      return overrideType(type, config) || postgresqlTypeMap[type];
    case "cockroachdb":
      return overrideType(type, config) || postgresqlTypeMap[type];
  }
};

export const generateFieldType = (type: string, config: Config) => {
  const fieldType = generateFieldTypeInner(type, config);
  if (!fieldType)
    throw new Error(
      `Unsupported type ${type} for database ${config.databaseProvider}`
    );
  return fieldType;
};
