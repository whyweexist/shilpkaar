/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_ML_URL?: string;
  readonly VITE_USE_RMBG?: string;
  readonly VITE_BHASHINI_KEY?: string;
  readonly VITE_BHASHINI_USER_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
