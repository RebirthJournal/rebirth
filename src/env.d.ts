/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_KEYSTATIC_GITHUB_REPO?: string;
}

declare module "*.astro" {
  type AstroComponent = (props: Record<string, unknown>) => unknown;
  const component: AstroComponent;
  export default component;
}
