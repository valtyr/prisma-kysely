---
"prisma-kysely": patch
---

Uses the value of fileName when no enumFileName provided. Previously now if you used a different fileName and you didn't provide enumFileName it put the database in the fileName and enums in types.ts.

Now imports GeneratedAlways only when needed. Previously it was always added, even if not needed which caused problems with the linter.
