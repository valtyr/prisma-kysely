---
"prisma-kysely": patch
---

Remove `unsupportedTypeOverride`. It never had any effect: `Unsupported(...)`
fields are skipped by the generator before the override is consulted. If you
have it in your `schema.prisma`, delete the line.
