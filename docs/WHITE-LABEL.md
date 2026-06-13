# White-label architecture

This app is white-labelled **per institute as its own deployment** — not a single
multi-tenant app. Each institute gets its own repository (created from this
template), its own Vercel project, its own domain, and its own data store. The
scoring engine and all UI are shared via the template; everything
institute-specific lives in one config file.

## Why per-deployment (not multi-tenant)

- Each institute runs a different internal pravilnik, so customisation is the norm
  — a shared codebase would fight that.
- Data isolation is structural: separate deployment = separate Redis, no shared
  keyspace, nothing to leak across institutes.
- Access control is per-institute (their SSO or a simple password gate), with no
  central identity system to build.
- A bug or deploy for one institute cannot affect another.

The trade-off is maintenance fan-out: a core fix must reach every institute. That
is handled by the template + merge workflow below, which keeps each institute's
changes confined to a single config file so upstream merges rarely conflict.

## The customisation surface

Everything institute-specific is `src/lib/institute/`:

- **`types.ts`** — the `InstituteConfig` shape (brand, colours, data-source IDs,
  organisation, roster, ruleset).
- **`ier.ts`** — the IER config. **Copy this file to create a new institute.**
- **`ruleset.ts`** — the rulebook-as-data abstraction. An institute whose pravilnik
  diverges from the baseline references a different `Ruleset` here.
- **`theme.ts`** — turns the config's colour set into the CSS-variable overrides the
  layout injects, so brand colours come from config, not hardcoded CSS.
- **`index.ts`** — exports `INSTITUTE`, the single active config for this build.

Everything else (`engine`, `components`, `app`, the rest of `lib`) is shared and
should be edited only in the template.

## Creating a build for a new institute

1. Create a **private** repository from this template (GitHub → "Use this
   template", or fork). Private because it will hold a roster + (later) an internal
   rulebook behind a password.
2. Add `upstream` so core fixes can flow in:
   `git remote add upstream https://github.com/lukatalks/NazivIER.git`
3. Copy `src/lib/institute/ier.ts` → `<id>.ts`, change every value (brand,
   colours, `sources` IDs, organisation, roster, ruleset), and point `INSTITUTE`
   in `src/lib/institute/index.ts` at the new config.
4. Drop the institute's logos under `public/brand/<id>/` and reference them from
   the config's `logoLight` / `logoDark`.
5. If the institute's pravilnik diverges, add a `Ruleset` in `ruleset.ts` and set
   the config's `ruleset` to it. Otherwise it stays on the shared baseline.
6. Create a Vercel project from the repo, attach the institute's domain
   (e.g. `naziv.<institute>.si`), set the env vars (Upstash Redis, `NEXT_PUBLIC_SITE_URL`).
7. Deploy.

## Keeping a build in sync with the template

Core engine / UI / security fixes land in the template (`upstream/main`). To pull
them into an institute build:

```
git fetch upstream
git merge upstream/main
```

Because each build's edits are confined to `src/lib/institute/<id>.ts`,
`public/brand/<id>/` and a few env vars, these merges almost never conflict.

## Access protection (per build)

Set `access.mode` in the institute config. IER is `'open'` (the public demo);
the middleware gate is then a pure pass-through.

- **Middleware password gate (built in)** — set `access: { mode: 'password' }`
  and provide `HABILIS_ACCESS_PASSWORDS` in the build's Vercel env: a
  comma-separated allow-list (one entry per employee, or a single shared value).
  The middleware then requires HTTP Basic auth on every page; any listed password
  is accepted. Note: the matcher excludes `/api/*`, so API routes are not yet
  gated — protecting them is a follow-up (add the same check to the route
  handlers) for institutes that need it.
- **Vercel deployment password** — simplest; one shared password set on the
  Vercel project, no code at all.
- **Institute SSO** — proxy/redirect to the institute's own OIDC/SAML. Not built;
  needs the institute's IdP details.

With `mode: 'open'` a build is reachable by anyone with the URL — fine for a
public demo, not for production data.
