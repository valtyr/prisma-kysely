# prisma-kysely

## 3.0.0

### Major Changes

- c25e269: Support Prisma 7.0.0+

  To upgrade:
  - Ensure you are using Bun, or Node.js >=22.x
  - Update your Prisma dependency to 7.0.0 or later
  - Review the [Prisma 7.0.0 upgrade guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7)
  - Move your database url to the prisma.config.ts file

## 2.3.0

### Minor Changes

- c038a9e: support prisma >=6.2 <7.0

## 2.2.1

### Patch Changes

- 649f4b7: Bump Prisma to 6.16

## 2.2.0

### Minor Changes

- f3d93bc: Introduce the `exportWrappedTypes` option for exporting types wrapped in Kysely's Selectable, Insertable and Updatable helpers

## 2.1.0

### Minor Changes

- 37bcf6d: Support the `Json` type with SQLite

## 2.0.0

### Major Changes

- 8fab339: Support for prisma 6.10.1

### Minor Changes

- 8fab339: Add `groupBySchema` to group types and enums under a namespace
- 8fab339: Move from Node 16 to Node 24
- 8fab339: Add dbTypeName

### Patch Changes

- 8fab339: Use node:sqlite inside tests
- 8fab339: Handle enum primary keys on many-to-many relationships

## 1.8.0

### Minor Changes

- 4526321: Added support for the Kysely SQL Server dialect Awesome work from @dylel 🎊

### Patch Changes

- 04de4dc: Fixed automatic relation code generation bug. Thanks @Bayezid1989 🥳

## 1.7.1

### Patch Changes

- 22a1e5c: Fixes array types (Thanks Karrui! 🥳🇸🇬)
- 21980b2: Updates dependencies that were throwing deprectaion warnings. (Thank you @delight! 🍺)

## 1.7.0

### Minor Changes

- bf0ccf6: Implicit many to many relations are finally fixed thanks to @dextertanyj 🇸🇬🎉🥂. Huge thanks to him!

## 1.6.0

### Minor Changes

- defb3fa: Update typescript to 5 and migrate from ttypescript to ts-patch (Thank you @alandotcom! 🎉)

## 1.5.0

### Minor Changes

- 3ec4465: Support `multiSchema` preview feature. (Thanks to @duniul 🇸🇪🪅)

### Patch Changes

- 7923981: Adds per field type overrides
- 6a50fe8: Respect mapped names for fields with enum types. (Thank you @fehnomenal 🇩🇪🎉)
- 3ec4465: Sort DB properties by table name instead of type name. (Thank you @duniul 🇸🇪🪅)

## 1.4.2

### Patch Changes

- 744b666: Uses the value of fileName when no enumFileName provided. Previously now if you used a different fileName and you didn't provide enumFileName it put the database in the fileName and enums in types.ts.

  Now imports GeneratedAlways only when needed. Previously it was always added, even if not needed which caused problems with the linter.

## 1.4.1

### Patch Changes

- 36393b6: Bugfix: revert to own generated type, that supports ColumnType

## 1.4.0

### Minor Changes

- 3288b72: Support @map statement for enum values (Thank you @jvandenaardweg 🔥🇳🇱)
- 299de40: Adds support for Kysely's `GeneratedAlways` through a new config parameter `readOnlyIds`. The generated type file no longer includes and exports the `Generated` generic.
- 66019e8: Brings back support for implicit many to many models after DMMF changes introduced in new version of Prisma

### Patch Changes

- 2659cc3: Now using narrower types for enum objects bringing `prisma-kysely`'s enums in line with `prisma-client-js` (Thank you @jvandenaardweg 🎉)

## 1.3.0

### Minor Changes

- a96f2d7: Add option to output runtime enums to a separate file (Thank you @juliusmarminge! 🇸🇪🎉)

## 1.2.1

### Patch Changes

- ff5bc59: Add object declarations for enums, that can be used (among other things) for runtime validation. Thanks @jvandenaardweg for the idea! 😎👍

## 1.2.0

### Minor Changes

- 533e41e: Pass Prisma comments on Prisma fields to the generated TypeScript types
- 8892135: Add support for field level @map and update core dependencies

## 1.1.0

### Minor Changes

- 7ab12d5: The first minor version bump 😮. Turns out some of the type maps were wrong. This update corrects `BigInt` and `Decimal` types for all dialects, and corrects the `DateTime` type for SQLite.

## 1.0.11

### Patch Changes

- 1cb96de: Update README

## 1.0.10

### Patch Changes

- Add support for CockroachDB (thanks to @yevhenii-horbenko 🥳)

## 1.0.9

### Patch Changes

- 3bb5d89: Add support for Kysely's camel case plugin

## 1.0.8

### Patch Changes

- e7ecabe: Adds Typescript as a primary dependency in order to fix issue #8

## 1.0.7

### Patch Changes

- 0a50f6f: Add support for @@map("...") statements (mapping models to different table names) and table names with spaces
