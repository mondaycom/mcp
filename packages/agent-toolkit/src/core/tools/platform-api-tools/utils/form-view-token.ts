export const parseFormViewToken = (viewSpecificDataStr: string | null | undefined): string | undefined => {
  if (!viewSpecificDataStr) {
    return undefined;
  }
  try {
    const token = JSON.parse(viewSpecificDataStr)?.token;
    return typeof token === 'string' && token.length > 0 ? token : undefined;
  } catch {
    return undefined;
  }
};
