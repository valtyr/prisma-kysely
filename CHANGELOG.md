# prisma-kysely

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
