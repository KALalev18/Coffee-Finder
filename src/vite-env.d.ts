/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OVERPASS_URLS?: string;
  readonly VITE_NOMINATIM_URL?: string;
  readonly VITE_SEARCH_RADIUS_M?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
