import { expect, test } from "vitest";

import { generateDatabaseType } from "~/helpers/generateDatabaseType";
import { stringifyTsNode } from "~/utils/testUtils";

test("it works for plain vanilla type names", () => {
  const node = generateDatabaseType(
    [
      { tableName: "Bookmark", typeName: "Bookmark" },
      { tableName: "Session", typeName: "Session" },
      { tableName: "User", typeName: "User" },
    ],
    {
      databaseProvider: "postgresql",
      fileName: "",
      enumFileName: "",
      camelCase: false,
    }
  );
  const result = stringifyTsNode(node);

  expect(result).toEqual(`export type DB = {
    Bookmark: Bookmark;
    Session: Session;
    User: User;
};`);
});

test("it respects camelCase option names", () => {
  const node = generateDatabaseType(
    [
      { tableName: "book_mark", typeName: "Bookmark" },
      { tableName: "session", typeName: "Session" },
      { tableName: "user_table", typeName: "User" },
    ],
    {
      databaseProvider: "postgresql",
      fileName: "",
      enumFileName: "",
      camelCase: true,
    }
  );
  const result = stringifyTsNode(node);

  expect(result).toEqual(`export type DB = {
    bookMark: Bookmark;
    session: Session;
    userTable: User;
};`);
});

test("it works for table names with spaces and weird symbols", () => {
  const node = generateDatabaseType(
    [
      { tableName: "Bookmark", typeName: "Bookmark" },
      { tableName: "user session_*table ;D", typeName: "Session" },
      { tableName: "User", typeName: "User" },
    ],
    {
      databaseProvider: "postgresql",
      fileName: "",
      enumFileName: "",
      camelCase: false,
    }
  );
  const result = stringifyTsNode(node);

  expect(result).toEqual(`export type DB = {
    Bookmark: Bookmark;
    "user session_*table ;D": Session;
    User: User;
};`);
});
