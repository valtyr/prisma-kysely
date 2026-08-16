---
"prisma-kysely": minor
---

Add `schemaGrouping` as the new schema grouping control, with `"none"`, `"namespace"`, and `"exports"` modes.

`schemaGrouping = "namespace"` keeps the existing single-file namespace output, where non-default schemas are emitted as TypeScript namespaces and database table references use names such as `Animals.Dog`. Existing users of `groupBySchema = true` continue to get this behavior because `groupBySchema` is now treated as a legacy alias for `schemaGrouping = "namespace"`.

`schemaGrouping = "exports"` adds a split-file output mode for multi-schema projects. When `fileName = "types.ts"`, the generator now writes `types/index.ts` plus one file per non-default schema, such as `types/animals.ts`. The index file still exports the main `DB` type and exposes each schema through namespace-style module exports, for example `export * as Animals from "./animals"`. This preserves the ergonomic `Animals.Dog` type shape while avoiding TypeScript namespace declarations in generated code.

The split-file mode keeps default-schema declarations in the index file and writes non-default schema declarations as normal exported types in their schema file. Cross-schema enum references are imported between schema files, and schema files import shared generated helpers such as `Generated` and `Timestamp` from the index instead of redefining those helpers in every file.

Grouped modes now own enum placement, so `enumFileName` is ignored when `schemaGrouping` is `"namespace"` or `"exports"`. This avoids splitting schema-owned declarations into incompatible files and keeps grouped output self-contained.
