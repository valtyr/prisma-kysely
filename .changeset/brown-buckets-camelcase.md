---
"prisma-kysely": minor
---

Fix `camelCase = true` for all-uppercase database names (#113).

Mapped names such as `UPDATED_AT`, `ID`, or `TEST_CUSTOMERS` were emitted as
`UPDATEDAT`, `ID`, and `TESTCUSTOMERS`. They now become `updatedAt`, `id`, and
`testCustomers`.

This matches Kysely's `new CamelCasePlugin({ upperCase: true })`. If your
database uses ALL_CAPS names, pass `upperCase: true` to the plugin so the
generated types match the row keys at runtime. Lowercase snake_case names are
unaffected either way.
