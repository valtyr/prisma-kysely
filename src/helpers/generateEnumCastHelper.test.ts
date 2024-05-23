import ts, { createPrinter } from "typescript";
import { expect, test } from "vitest";

import { generateEnumCastHelper } from "~/helpers/generateEnumCastHelper";

test("it generates nothing if there are no enums", () => {
  const result = generateEnumCastHelper([]);
  expect(result).toEqual([]);
});

test("it generates the enum cast helper", () => {
  const multiSchemaMap = new Map([["TemperatureUnit", "units"]]);

  const [
    namesObjectDeclaration,
    namesTypeDeclaration,
    valuesTypeDeclaration,
    castFunctionDeclaration,
  ] = generateEnumCastHelper(
    [
      {
        name: "Foo",
        values: [
          { name: "Foo", dbName: null },
          { name: "Bar", dbName: null },
        ],
      },
      {
        name: "Shape",
        dbName: "a shape",
        values: [
          { name: "CIRCLE", dbName: null },
          { name: "SQUARE", dbName: null },
        ],
      },
      {
        name: "TemperatureUnit",
        dbName: "temperature_unit",
        values: [
          { name: "CELSIUS", dbName: null },
          { name: "FAHRENHEIT", dbName: null },
        ],
      },
    ],
    multiSchemaMap
  );

  const printer = createPrinter();

  const result = printer.printList(
    ts.ListFormat.MultiLine,
    ts.factory.createNodeArray([
      namesObjectDeclaration,
      namesTypeDeclaration,
      valuesTypeDeclaration,
      castFunctionDeclaration,
    ]),
    ts.createSourceFile("", "", ts.ScriptTarget.Latest)
  );

  expect(result).toEqual(`const EnumNames = {
    Foo: Foo,
    "a shape": Shape,
    "units.temperature_unit": TemperatureUnit
} as const;
type EnumNames = typeof EnumNames;
type EnumValues<Name extends keyof EnumNames> = EnumNames[Name][keyof EnumNames[Name]];
export function castEnumValue<Name extends keyof EnumNames, Value extends EnumValues<Name> | null>(value: Value | ExpressionWrapper<any, any, Value>, name: Name): RawBuilder<Value> { return sql<Value> \`\${value}::\${sql.id(name)}\`; }\n`);
});
