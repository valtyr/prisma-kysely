---
"prisma-kysely": minor
---

Add `enumArrayType` to control how Prisma enum-array fields are generated.

The new default is `enumArrayType = "array"`, which emits enum arrays as the corresponding TypeScript enum union array, for example `Permission[]`. This is the most useful type when the application registers PostgreSQL enum-array parsers with `pg`, because query results then contain real JavaScript arrays instead of raw PostgreSQL array literal strings.

For applications that rely on the default `pg` behavior for user-defined enum arrays, `enumArrayType = "string"` preserves the previous safer output. In that mode an enum-array column is typed as `string`, matching raw values such as `{FOO,BAR}` or `{}` returned by `pg` when no parser is registered for the enum array OID.

This makes the behavior explicit instead of forcing one runtime assumption on every project. Projects with enum-array parser registration can use precise array types, while projects without parser registration can keep the raw-string typing introduced for the PostgreSQL enum-array parsing limitation described in `node-pg-types` issue 56.
