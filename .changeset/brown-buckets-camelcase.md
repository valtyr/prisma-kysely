---
"prisma-kysely": patch
---

Fix `camelCase = true` for all-uppercase mapped table and column names.

Previously names such as `UPDATED_AT`, `ID`, or `TEST_CUSTOMERS` could be emitted as `UPDATEDAT`, `ID`, and `TESTCUSTOMERS` because the camel-case mapper preserved uppercase segments instead of normalizing all-uppercase snake-case identifiers first. This affected schemas that map database names with uppercase conventions through Prisma `@map` and `@@map`.

The generator now treats all-uppercase snake-case names as database identifiers that should be lowercased before camel-case conversion. With `camelCase = true`, `UPDATED_AT` becomes `updatedAt`, `ID` becomes `id`, and `TEST_CUSTOMERS` becomes `testCustomers`, matching the behavior users expect from Kysely's camel case plugin.
