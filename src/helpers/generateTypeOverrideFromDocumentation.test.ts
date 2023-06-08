import { expect, test } from "vitest";

import { generateTypeOverrideFromDocumentation } from "./generateTypeOverrideFromDocumentation";

test("finds a type override", () => {
  const docString =
    "this is some property \n here is the type override @kyselyType('admin' | 'member') ";

  expect(generateTypeOverrideFromDocumentation(docString)).toEqual(
    "'admin' | 'member'"
  );
});

test("supports parentheses in type", () => {
  const docString =
    "this is some property \n here is the type override @kyselyType(('admin' | 'member')) ";

  expect(generateTypeOverrideFromDocumentation(docString)).toEqual(
    "('admin' | 'member')"
  );
});

test("reacts correctly to unbalanced parens", () => {
  const docString =
    "this is some property \n here is the type override @kyselyType(('admin' | 'member') ";

  expect(generateTypeOverrideFromDocumentation(docString)).toEqual(null);
});

test("reacts correctly to extra parens", () => {
  const docString =
    "this is some property \n here is the type override @kyselyType(('admin' | 'member'))) ";

  expect(generateTypeOverrideFromDocumentation(docString)).toEqual(
    "('admin' | 'member')"
  );
});

test("finds type following incomplete one", () => {
  const docString =
    "this is some property \n here is the type @kyselyType( override @kyselyType('admin' | 'member') ";

  expect(generateTypeOverrideFromDocumentation(docString)).toEqual(
    "'admin' | 'member'"
  );
});

test("doesn't do anything in case of no type", () => {
  const docString = "this is some property with no override";

  expect(generateTypeOverrideFromDocumentation(docString)).toEqual(null);
});

test("bails when we have an at sign and no match", () => {
  const docString = "hit me up at squiggly@goofy.af";

  expect(generateTypeOverrideFromDocumentation(docString)).toEqual(null);
});
