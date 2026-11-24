// Vite imports a file as its text when the path ends in ?raw (see gmail-styles.ts).
declare module '*.css?raw' {
  const content: string;
  export default content;
}
