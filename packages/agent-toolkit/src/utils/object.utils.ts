export const stringifyIfObject = (obj: Record<string, any> | string): string => {
  return typeof obj === 'object' ? JSON.stringify(obj) : obj;
};