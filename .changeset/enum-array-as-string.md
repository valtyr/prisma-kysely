---
"prisma-kysely": patch
---

Emit enum arrays as `string` under PostgreSQL and CockroachDB, matching how Kysely represents enum array columns. Fixes #107.
