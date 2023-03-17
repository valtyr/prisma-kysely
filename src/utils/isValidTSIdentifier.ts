const isValidTSIdentifier = (ident: string) =>
  !!ident && /^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(ident);
export default isValidTSIdentifier;
