# Cloudflare Pages release

The application exports a static `out/` directory. It has no Pages Functions, Workers API, D1 binding, or secrets. Hosting target: Cloudflare Pages Free and its provider subdomain.

## Production site

Published on 26 October 2026 (Asia/Dhaka), after the owner requested deployment. Production URL: **https://assetsanitize.pages.dev/**. Cloudflare project: `assetsanitize`.

The connected Cloudflare plugin created the project and linked the existing public GitHub repository. The separate saved Wrangler login was left unchanged. No paid resources, application server, Pages Functions, analytics integration, or secrets were added.

## Automatic deployment

Push to `main` in [shawalkabirchy/AssetSanitize](https://github.com/shawalkabirchy/AssetSanitize). Cloudflare builds and publishes that branch with:

- Build command: `npm run build`
- Output directory: `out`
- Root directory: `/`
- Build environment: `NODE_VERSION=24.14.0`
- Preview branch deployments: disabled
- Web Analytics: disabled

The initial verified production deployment is `bc6a3627-2293-47ae-93c2-fb08c3bcff4f`, built from `7df38888903254bf3506641a70d0a154704ba702`. Its immutable URL is https://bc6a3627.assetsanitize.pages.dev. Verification evidence is recorded in [verification.md](verification.md).

## Local release checks and manual deployment

```sh
npm ci
npm test
npm run build
npm run test:e2e
npx wrangler@4.152.0 login --scopes user:read account:read pages:write
npx wrangler@4.152.0 pages deploy out --project-name assetsanitize --branch main
```

Wrangler authentication is only needed for manual uploads. The existing Git integration handles normal deployments without a local Cloudflare login. Use the URL returned by Cloudflare and verify it before recording a release. Keep the site on static Pages hosting and do not enable paid resources.

The app deliberately uses Webpack in both development and production. There is no `next start` server or Next.js runtime adapter in the deployed site.

`public/_headers` ships with the static export. It disables framing, MIME sniffing, referrers, camera/microphone/geolocation permissions, forms, and cross-origin content/connection sources. Inline script/style permissions are required by the Next.js static shell. Same-origin connections remain available for the sample. Disable any provider-injected analytics or script integrations.

## Release check

Open the actual HTTPS URL on desktop and a 360px viewport. Load the sample, inspect its identifying tags, clean it, download the verified PNG, and independently check that output. Inspect network requests and response security headers. Confirm worker chunks, favicon, sample, and license notices load from the same origin. Clear and reload the page. Record the actual deployment URL and results in verification.md and keep the README demo link current.

## Rollback

Keep the last verified deployment. Use Cloudflare Pages deployment history to restore it if a release fails; verify the sample and worker again. There are no user records or database migrations to restore. A browser tab already holding results remains independent of a hosting rollback.
