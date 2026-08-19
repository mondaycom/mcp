// Some environments that run unit tests in this monorepo don't install optional
// parsing dependencies (e.g. exceljs/unpdf). We still want TypeScript to compile
// and Jest to run the relevant tool tests.

declare module 'exceljs' {
  const ExcelJS: any;
  export default ExcelJS;
}

declare module 'unpdf' {
  export const getDocumentProxy: any;
  export const extractText: any;
}

declare module 'mammoth' {
  const mammoth: any;
  export default mammoth;
}

