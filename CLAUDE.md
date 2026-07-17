# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page React demo storefront ("Minders Ecommerce") whose real purpose is to exercise a customer-data/analytics pipeline, not to be a production e-commerce app. Nearly the entire UI lives in one component and its job is to fire the right events, in the right shape, at the right points in the user journey (browse → view product → add to cart → checkout → confirm).

## Commands

```bash
npm run dev      # start Vite dev server
npm run build    # production build
npm run lint     # eslint (flat config, eslint.config.js)
npm run preview  # preview a production build
```

There is no test runner configured in this repo.

## Architecture

### Entry chain
`src/main.jsx` → `src/App.jsx` → `src/MindersEcommerce.jsx`. Almost all app logic, state, and markup lives in `MindersEcommerce.jsx` (a single ~700-line component) — there is no router and no other page-level components.

### The drawer/journey model
A single sliding `<aside>` drawer is reused for four different views, switched via `drawerMode` (`"product" | "cart" | "checkout" | "confirm"`). `journeyStep` (0–3) drives the progress indicator ("Visto" / "Agregado" / "Comprado") shown at the top of the drawer. When adding new steps to the user journey, extend this same drawerMode/journeyStep pair rather than introducing a separate view mechanism.

### Three parallel tracking paths fire on the same user actions
Every meaningful user action (page view, product view, add to cart, order completed, checkout started) is expected to notify multiple systems, and these are kept in sync **by hand** — there's no shared event schema enforcing it:

1. **Backend REST API** — `trackAnalyticsEvent()` in `MindersEcommerce.jsx` POSTs to `API_BASE` (`VITE_API_BASE` env var, defaults to `http://localhost:8080`) using the endpoint map `EVENT_ENDPOINTS`. The backend itself is not part of this repo. The JSON response's `sentToBraze` flag indicates whether the backend forwarded the event to Braze; this is surfaced to the user via the toast notifications in the bottom-left corner (useful for visually confirming instrumentation while developing).
2. **Amplitude Analytics (client-side)** — `src/ampli/index.js` is a hand-written stand-in for the official Amplitude `ampli` codegen output. Its header comments explain it is meant to be replaced by running `ampli pull` once a real Amplitude Data taxonomy/API key is available. Each tracked event has a same-named function here (`pageViewed`, `productViewed`, `productAddedToCart`, `orderCompleted`, `checkoutStarted`) plus an `identify()` call — event names/props are fixed by the taxonomy and shouldn't be changed casually.
3. **Amplitude Experiment (A/B test)** — `src/experiment.js` is a lazy-initialized singleton client for the `shipping-cost-display` flag (`control` vs `treatment`), fetched once per session via `fetchVariant()`. The `treatment` variant renders a prominent shipping-cost callout in the cart drawer (see the `VARIANT_TREATMENT` branch around the cart totals in `MindersEcommerce.jsx`); `control` renders a plain shipping line. The variant is also passed as `experiment_variant` on the `checkoutStarted` event, since Checkout Started is the experiment's primary metric.

When adding a new trackable action, mirror all three paths: add an entry to `EVENT_ENDPOINTS`, add a matching function to `src/ampli/index.js`, and call both from the handler in `MindersEcommerce.jsx`.

### Env vars (Vite-style, all optional — code degrades gracefully with console warnings if unset)
- `VITE_AMPLITUDE_API_KEY` — Amplitude Analytics API key. Missing/`"CHANGE_ME"` → events aren't sent, only logged.
- `VITE_AMPLITUDE_EXPERIMENT_KEY` — Amplitude Experiment deployment (client) key. Missing/`"CHANGE_ME"` → everyone gets `"control"`.
- `VITE_API_BASE` — backend base URL. Defaults to `http://localhost:8080`.

No `.env` file is checked into the repo.

### Styling
Tailwind is wired up two different ways at once: `index.html` loads the Tailwind CDN script directly, and separately `src/index.css` has `@tailwind` directives with `tailwindcss` as a devDependency. There is no `postcss.config.js` at the project root, and `tailwind.config.js` lives under `src/assets/` rather than the root, so the local PostCSS build pipeline is not actually connected — in practice, styling in the browser is being produced by the CDN script tag, not the npm-installed Tailwind toolchain.

### Data
`PRODUCTS` and `CONTENT_CARDS` in `MindersEcommerce.jsx` are hardcoded in-memory arrays (demo data), not fetched from an API.
