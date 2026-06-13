# White-label architecture

This app serves multiple research institutes from a single deployment. The
scoring engine is shared; everything institute-specific is configuration,
resolved per request from the incoming `Host` header.

## How it works

```
request → Host header → resolveTenantFromHost() → TenantConfig
                                                      ├─ brand (name, logos, colours)
                                                      ├─ sources (SICRIS / OpenAlex / projects IDs)
                                                      ├─ organization + roster
                                                      └─ ruleset reference
```

- **`src/lib/tenancy/types.ts`** — the `TenantConfig` shape.
- **`src/lib/tenancy/tenants/*.ts`** — one file per institute.
- **`src/lib/tenancy/registry.ts`** — the list of tenants + the default fallback.
- **`src/lib/tenancy/resolve.ts`** — pure `Host → TenantConfig` resolution (exact
  host match, then leading-subdomain label, then default).
- **`src/lib/tenancy/server.ts`** — `getTenant()` for Server Components and
  `generateMetadata` (reads the Host header; renders the route dynamically).
- **`src/lib/tenancy/theme.ts`** — emits the per-tenant CSS-variable override the
  layout injects, so brand colours come from config, not hardcoded CSS.
- **`src/lib/tenancy/ruleset.ts`** — the rulebook-as-data abstraction. Each tenant
  references a ruleset by id; all tenants currently share the IER/ARIS baseline.

## Adding a tenant

1. Create `src/lib/tenancy/tenants/<id>.ts` exporting a `TenantConfig`
   (copy `ier.ts` as a template). Set `id`, `hosts`, `brand`, `sources`,
   `organization`, `roster`, and `ruleset`.
2. Add it to `TENANTS` in `src/lib/tenancy/registry.ts`.
3. Point the institute's domain (e.g. `naziv.<institute>.si`) at this
   deployment and attach it in Vercel.
4. Deploy. The new host resolves to the new tenant automatically — branding,
   roster, colours and data-source IDs all follow from the config file.

Per-tenant manual inputs are isolated in storage: the default tenant keeps the
original keyspace; every other tenant is namespaced under its `id`, so no
institute can read or overwrite another's data.

## Custom rulebook (per tenant)

If an institute's internal pravilnik diverges from the baseline thresholds or
weights, add a new `Ruleset` in `ruleset.ts` and reference it from the tenant.
The abstraction exists today; threading a tenant's ruleset all the way through
the evaluator is the next engine step (see in-file notes in `ruleset.ts`).
