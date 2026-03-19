/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SHEET_ID: string
    readonly VITE_SHEETS_API_KEY: string
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }