![Prisma Kysely](assets/logo-hero.png)

<p align="center">
<a href="https://www.npmjs.com/package/prisma-kysely"><img src="https://badge.fury.io/js/prisma-kysely.svg"></a>
</p>

<br/>

![Hero image "Generate Kysely types directly from your Prisma
schema"](assets/hero.png)

<br/>

> 🚧 **Library and README in progress...**

Do you like Prisma's migration flow, schema language and DX but not the
limitations of the Prisma Client? Do you want to harness the raw power of SQL
without losing the safety of the TypeScript type system?

**Enter `prisma-kysely`**!

### Setup

1. Install `prisma-kysely` using your package manager of choice:

   ```sh
   yarn add prisma-kysely
   ```

2. Replace (or augment) the default client generator in your `schema.prisma`
   file with the following:

   ```prisma
   generator kysely {
       provider = "prisma-kysely"

       // Optionally provide a destination directory for the generated file
       // and a filename of your choice
       output = "../src/db"
       fileName = "types.ts"
       // Optionally generate runtime enums to a separate file
        enumFileName = "enums.ts"
   }
   ```

3. Run `prisma migrate dev` or `prisma generate` and use your freshly generated
   types when instantiating Kysely!

### Motivation

Prisma's migration and schema definition workflow is undeniably great, and the
typesafety of the Prisma client is top notch, but there comes a time in every
Prisma user's life where the client becomes just a bit too limiting. Sometimes
we just need to write our own multi table joins and squeeze that extra drop of
performance out of our apps. The Prisma client offers two options: using their
simplified query API or going all-in with raw SQL strings, sacrificing type
safety.

This is where Kysely shines. Kysely provides a toolbox to write expressive,
type-safe SQL queries with full autocompletion. The problem with Kysely though
is that it's not super opinionated when it comes to schema definition and
migration. What many users resort to is using something like Prisma to define
the structure of their databases, and `kysely-codegen` to introspect their
databases post-migration.

This package, `prisma-kysely`, is meant as a more integrated and convenient way
to keep Kysely types in sync with Prisma schemas. After making the prerequisite
changes to your schema file, it's just as convenient and foolproof as using
Prisma's own client.

I've been using this combo for a few months now in tandem with Cloudflare's D1
for my private projects and Postgres at work. It's been a game-changer, and I
hope it's just as useful for you! 😎

### Config

| Key                      | Description                                                                                                                                                                                                                                                                                                                                                                         |
| :----------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `output`                 | The directory where generated code will be saved                                                                                                                                                                                                                                                                                                                                    |
| `fileName`               | The filename for the generated file                                                                                                                                                                                                                                                                                                                                                 |
| `enumFileName`           | The filename for the generated enums. Omitting this will generate enums and files in the same file.                                                                                                                                                                                                                                                                                 |
| `camelCase`              | Enable support for Kysely's camelCase plugin                                                                                                                                                                                                                                                                                                                                        |
| `readOnlyIds`            | Use Kysely's `GeneratedAlways` for `@id` fields with default values, preventing insert and update.                                                                                                                                                                                                                                                                                  |
| `[typename]TypeOverride` | Allows you to override the resulting TypeScript type for any Prisma type. Useful when targeting a different environment than Node (e.g. WinterCG compatible runtimes that use UInt8Arrays instead of Buffers for binary types etc.) Check out the [config validator](https://github.com/valtyr/prisma-kysely/blob/main/src/utils/validateConfig.ts) for a complete list of options. |

### Per-field type overrides

In some cases, you might want to override a type for a specific field. This
could be useful, for example, for constraining string types to certain literal
values. Be aware though that this does not of course come with any runtime
validation, and in most cases won't be guaranteed to match the actual data in
the database.

That disclaimer aside, here's how it works: Add a `@kyselyType(...)` declaration
to the Prisma docstring (deliniated using three slashes `///`) for the field
with your type inside the parentheses.

```prisma
model User {
  id          String @id
  name        String

  /// @kyselyType('member' | 'admin')
  role        String
}
```

The parentheses can include any valid TS type declaration.

The output for the example above would be as follows:

```ts
export type User = {
  id: string;
  name: string;
  role: "member" | "owner";
};
```

### Gotchas

#### Default values

By default (no pun intended) the Prisma Query Engine uses JS based
implementations for certain default values, namely: `uuid()` and `cuid()`. This
means that they don't end up getting defined as default values on the database
level, and end up being pretty useless for us.

Prisma does provide a nice solution to this though, in the form of
`dbgenerated()`. This allows us to use any valid default value expression that
our database supports:

```prisma
model PostgresUser {
   id    String @id @default(dbgenerated("gen_random_uuid()"))
}

model SQLiteUser {
   id    String @id @default(dbgenerated("(uuid())"))
}
```

[Check out the Prisma Docs for more
info.](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#attribute-functions)

### Contributions

OMG you actually want to contribute? I'm so thankful! 🙇‍♂️

Here's everything you need to do (let me know if something's missing...)

1. Fork and pull the repository
2. Run `yarn install` and `yarn dev` to start `tsc` in watch mode.
3. Make changes to the source code
4. Test your changes by creating `prisma/schema.prisma`, running `yarn prisma generate` and checking the output in `prisma/types.ts`. The provider must be set
   as follows to reference the dev build:
   ```prisma
   generator kysely {
       provider = "node ./dist/bin.js"
   }
   ```
5. Create a pull request! If your changes make sense, I'll try my best to review
   and merge them quickly.

I'm not 100% sure the [type
maps](https://github.com/valtyr/prisma-kysely/blob/main/src/helpers/generateFieldType.ts)
are correct for every dialect, so any and all contributions on that front would
be greatly appreciated. The same goes for any bug you come across or improvement
you can think of.

### Shoutouts

- I wouldn't have made this library if I hadn't used Robin Blomberg's amazing
  [Kysely Codegen](https://github.com/RobinBlomberg/kysely-codegen). For anyone
  that isn't using Prisma for migrations I wholeheartedly recommend his package.
- The implicit many-to-many table generation code is partly inspired by and
  partly stolen from
  [`prisma-dbml-generator`](https://github.com/notiz-dev/prisma-dbml-generator/blob/752f89cf40257a9698913294b38843ac742f8345/src/generator/many-to-many-tables.ts).
  Many-too-many thanks to them!
- Igal Klebanov ([@igalklebanov](https://github.com/igalklebanov)) and Jökull Sólberg ([@jokull](https://github.com/jokull)) for being this library's
  main proponents on Twitter!
- The authors and maintainers of Kysely ❤️‍🔥

```diff
+ Boyce-Codd gang unite! 💽
```
