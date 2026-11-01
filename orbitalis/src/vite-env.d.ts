/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the backend API, for example "/api". Leave unset to use the built-in mock API. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
