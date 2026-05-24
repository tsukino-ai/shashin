/// <reference types="@astrojs/cloudflare" />

interface Env {
  GALARY_BUCKET: R2Bucket;
}

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}
