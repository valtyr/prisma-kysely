export const sorted = <T>(list: T[], sortFunction?: (a: T, b: T) => number) => {
  const newList = [...list];
  newList.sort(sortFunction);
  return newList;
};
