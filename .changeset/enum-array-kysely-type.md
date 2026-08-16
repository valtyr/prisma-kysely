---
"prisma-kysely": minor
---

`@kyselyType(...)` annotations are now respected on enum fields.

Previously the annotation was silently ignored for enum fields. Enum array
columns are still typed as `string` by default (matching what the `pg` driver
returns when no enum-array parser is registered). Apps that receive real
arrays - via registered type parsers, `to_json` conversion, or a driver that
parses enum arrays - can now opt individual fields back into a real array
type:

```prisma
model User {
  /// @kyselyType(Permission[])
  permissions Permission[]
}
```

The annotation replaces the generated type wholesale, so it also works for
narrowing scalar enum fields.
