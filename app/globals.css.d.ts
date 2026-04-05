// app/globals.css.d.ts
// This shim silences the TypeScript "Cannot find module or type declarations
// for side-effect import of './globals.css'" error.
// Next.js handles the actual CSS processing; this file is for TS only.
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}