---
"prisma-kysely": patch
---

- use the value of fileName when no enumFileName provided. Right now if you use a different fileName and you don't provide enumFileName it will put database in the fileName and enums in types.ts.
- add GeneratedAlways only when needed. Right now it's always added, even if not needed which causes problems with linter.
