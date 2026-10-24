# Cloudflare Pages release

The application exports a static `out/` directory. It has no Pages Functions, Workers API, D1 binding, or secrets. Hosting target: Cloudflare Pages Free and its provider subdomain.

## Current access status

The owner requested **Keep deployment pending** on 25 October 2026. No Cloudflare credentials were refreshed and no Pages resources were created. The complete application and portfolio materials are available locally and in the public GitHub repository. Resume the steps below only when publication is requested.

GitHub authentication was verified. The existing Cloudflare OAuth login was checked with Wrangler 4.152.0. It is missing `pages:write`; listing Pages projects returned authentication error 10000. No Pages project or deployment has been created by this build yet. The owner must authorize Pages access before publication can finish.

## Deploy after authorization

```sh
npm ci
npm test
npm run build
npm run test:e2e
npx wrangler@4.152.0 login --scopes user:read account:read pages:write
npx wrangler@4.152.0 pages project create assetsanitize --production-branch main
npx wrangler@4.152.0 pages deploy out --project-name assetsanitize --branch main
```

If `assetsanitize` is unavailable, use `consolelog-assetsanitize` consistently in the create/deploy commands. Use the deployment URL returned by Cloudflare; do not claim an unverified URL is live. Confirm the account and Free plan before creating the project. Do not enable paid resources.

Alternatively connect the public GitHub repository in Pages, choose the static Next.js export preset, use `npm run build`, and publish `out`. Pin Node 24.14.0 in build settings. The app deliberately uses Webpack in both development and production.

`public/_headers` ships with the static export. It disables framing, MIME sniffing, referrers, camera/microphone/geolocation permissions, forms, and cross-origin content/connection sources. Inline script/style permissions are required by the Next.js static shell. Same-origin connections remain available for the sample. Disable any provider-injected analytics or script integrations.

## Release check

Open the actual HTTPS URL on desktop and a 360px viewport. Load the sample, inspect its identifying tags, clean it, download the verified PNG, and independently check that output. Inspect network requests and response security headers. Confirm worker chunks, favicon, sample, and license notices load from the same origin. Clear and reload the page. Record actual deployment URL and results in verification.md and replace the README's pending-demo line.

## Rollback

Keep the last verified deployment. Use Cloudflare Pages deployment history to restore it if a release fails; verify the sample and worker again. There are no user records or database migrations to restore. A browser tab already holding results remains independent of a hosting rollback.
