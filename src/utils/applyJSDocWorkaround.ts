export const applyJSDocWorkaround = (comment: string) => {
  return `*\n * ${comment.split("\n").join("\n * ")}\n `;
};
