// Fallback types if vite/client is missing or incomplete
declare interface ImportMetaEnv {
  [key: string]: any;
  VITE_GEMINI_API_KEY: string;
  GEMINI_API_KEY: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}