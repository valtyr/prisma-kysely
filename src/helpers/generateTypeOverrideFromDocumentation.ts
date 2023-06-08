const START_LEXEME = "@kyselyType(";

/**
 * Searches the field for a string matching @kyselyType(...) and uses
 * that as the typescript type of the field.
 *
 * @param documentation - The documentation string of the field
 * @returns
 */
export const generateTypeOverrideFromDocumentation = (
  documentation: string
) => {
  const tokens = documentation.split("");

  let matchState: { tokens: string[]; startLocation: number } | null = null;
  let parentheses = 0;
  let i = 0;
  while (i < documentation.length) {
    const currentToken = tokens[i];

    // If we're working on a match
    if (matchState) {
      // If we're working on a match and we find the end
      // return the result.
      if (currentToken === ")" && parentheses === 0)
        return matchState.tokens.join("");

      // Increment or decrement the parentheses counter
      // if we reach parentheses
      if (currentToken === ")") parentheses--;
      if (currentToken === "(") parentheses++;

      // Append the current token to the match state.
      matchState.tokens.push(currentToken);

      i++;

      // If we've reached the end of the documentaion
      // without a match we should bail and continue
      // scanning.
      if (i === documentation.length) {
        i = matchState.startLocation + 1;
        matchState = null;
        continue;
      }

      continue;
    }

    // If we find the beginning of the start lexeme
    // we can continue checking for the full lexeme
    if (currentToken === "@") {
      const isMatch =
        tokens.slice(i, i + START_LEXEME.length).join("") === START_LEXEME;

      // If we don't find a match we bail.
      if (!isMatch) {
        i++;
        continue;
      }

      // Else start checking for the rest of the match
      matchState = { tokens: [], startLocation: i };
      i += START_LEXEME.length;

      continue;
    }

    i++;
  }

  return null;
};
