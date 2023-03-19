import { stringifyTsNode } from "../utils/testUtils";
import { generateDatabaseType } from "./generateDatabaseType";

test("it works for plain vanilla type names", () => {
  const node = generateDatabaseType([
    { tableName: "Bookmark", typeName: "Bookmark" },
    { tableName: "Session", typeName: "Session" },
    { tableName: "User", typeName: "User" },
  ]);
  const result = stringifyTsNode(node);

  expect(result).toEqual(`export type DB = {
    Bookmark: Bookmark;
    Session: Session;
    User: User;
};`);
});

test("it works for table names with spaces and weird symbols", () => {
  const node = generateDatabaseType([
    { tableName: "Bookmark", typeName: "Bookmark" },
    { tableName: "user session_*table ;D", typeName: "Session" },
    { tableName: "User", typeName: "User" },
  ]);
  const result = stringifyTsNode(node);

  expect(result).toEqual(`export type DB = {
    Bookmark: Bookmark;
    "user session_*table ;D": Session;
    User: User;
};`);
});
