export const formatFile = async (content: string) => {
  // If user has prettier, we find their config and
  // format. Otherwise we don't alter the file.

  try {
    const { default: prettier } = await import("prettier");

    const config = await prettier.resolveConfig(process.cwd());
    if (!config) return content;

    const formatted = prettier.format(content, {
      ...config,
      parser: "typescript",
    });

    return formatted;
  } catch {}

  return content;
};
