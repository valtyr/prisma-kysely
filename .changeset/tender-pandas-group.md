---
"prisma-kysely": minor
---

Add `groupBySchema = "module"` to emit one file per database schema.

With `fileName = "types.ts"`, output is written to `types/index.ts` plus one
file per non-default schema, such as `types/animals.ts`. The index file exports
the `DB` type and re-exports each schema with `export * as Animals from
"./animals"`, so the `Animals.Dog` shape is unchanged from `groupBySchema =
true` but without TypeScript namespaces. Schema files import cross-schema enum
references and shared helpers such as `Generated` from the index.

`groupBySchema = true` (namespaces in a single file) is unchanged.

`groupBySchema` will be removed in the next major version, and multi-schema
projects will always emit one file per schema.
