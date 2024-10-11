import { expect, test } from "vitest";

import { generateModel } from "~/helpers/generateModel";
import { stringifyTsNode } from "~/utils/testUtils";

test("it generates a model!", () => {
  const model = generateModel(
    {
      name: "User",
      fields: [
        {
          name: "id",
          isId: true,
          isGenerated: true,
          default: { name: "uuid", args: [] },
          kind: "scalar",
          type: "String",
          hasDefaultValue: true,
          isList: false,
          isReadOnly: false,
          isRequired: true,
          isUnique: false,
        },
        {
          name: "id2",
          isId: false,
          isGenerated: false,
          default: { name: "dbgenerated", args: ["uuid()"] },
          kind: "scalar",
          type: "String",
          hasDefaultValue: true,
          isList: false,
          isReadOnly: false,
          isRequired: true,
          isUnique: false,
        },
        {
          name: "name",
          isId: false,
          isGenerated: false,
          kind: "scalar",
          type: "String",
          hasDefaultValue: false,
          isList: false,
          isReadOnly: false,
          isRequired: false,
          isUnique: false,
        },
        {
          name: "unsupportedField",
          isId: false,
          isGenerated: false,
          kind: "unsupported",
          type: "String",
          hasDefaultValue: false,
          isList: false,
          isReadOnly: false,
          isRequired: false,
          isUnique: false,
        },
        {
          name: "objectField",
          isId: false,
          isGenerated: false,
          kind: "object",
          type: "SomeOtherObject",
          hasDefaultValue: false,
          isList: false,
          isReadOnly: false,
          isRequired: false,
          isUnique: false,
        },
        {
          name: "enumField",
          isId: false,
          isGenerated: false,
          kind: "enum",
          type: "CoolEnum",
          hasDefaultValue: false,
          isList: false,
          isReadOnly: false,
          isRequired: true,
          isUnique: false,
        },
      ],
      primaryKey: null,
      uniqueFields: [],
      uniqueIndexes: [],
      dbName: null,
    },
    {
      databaseProvider: "sqlite",
      fileName: "",
      enumFileName: "",
      camelCase: false,
      readOnlyIds: false,
    }
  );

  expect(model.tableName).toEqual("User");
  expect(model.typeName).toEqual("User");

  const source = stringifyTsNode(model.definition);

  expect(source).toEqual(`export type User = {
    id: string;
    id2: Generated<string>;
    name: string | null;
    enumField: CoolEnum;
};`);
});

test("it respects camelCase option", () => {
  const model = generateModel(
    {
      name: "User",
      fields: [
        {
          name: "id",
          isId: true,
          isGenerated: true,
          default: { name: "uuid", args: [] },
          kind: "scalar",
          type: "String",
          hasDefaultValue: true,
          isList: false,
          isReadOnly: false,
          isRequired: true,
          isUnique: false,
        },
        {
          name: "user_name",
          isId: false,
          isGenerated: false,
          kind: "scalar",
          type: "String",
          hasDefaultValue: false,
          isList: false,
          isReadOnly: false,
          isRequired: false,
          isUnique: false,
        },
      ],
      primaryKey: null,
      uniqueFields: [],
      uniqueIndexes: [],
      dbName: null,
    },
    {
      databaseProvider: "sqlite",
      fileName: "",
      enumFileName: "",
      camelCase: true,
      readOnlyIds: false,
    }
  );

  expect(model.tableName).toEqual("User");
  expect(model.typeName).toEqual("User");

  const source = stringifyTsNode(model.definition);

  expect(source).toEqual(`export type User = {
    id: string;
    userName: string | null;
};`);
});

test("it respects enum array values", () => {
  const model = generateModel(
    {
      name: "User",
      fields: [
        {
          name: "permissions",
          isId: false,
          isGenerated: false,
          kind: "enum",
          type: "UserPermissions",
          hasDefaultValue: false,
          isList: true,
          isReadOnly: false,
          isRequired: true,
          isUnique: false,
        },
      ],
      primaryKey: null,
      uniqueFields: [],
      uniqueIndexes: [],
      dbName: null,
    },
    {
      databaseProvider: "postgresql",
      fileName: "env(DATABASE_URL)",
      enumFileName: "",
      camelCase: true,
      readOnlyIds: false,
    }
  );

  const source = stringifyTsNode(model.definition);

  expect(source).toEqual(`export type User = {
    permissions: EnumArray<UserPermissions>;
};`);
});
