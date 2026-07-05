# Kaartspellen 🂡

Rustige, **reclamevrije** kaartspellen met grote, goed leesbare kaarten — gemaakt om
prettig te spelen op een tablet. Begint met **Patience** (Solitaire); de opzet is
klaar om later meer spellen toe te voegen.

A calm, **ad-free** collection of card games with large, high-contrast cards,
designed to be easy to play on a tablet — especially for older eyes. Installable as a
web app (PWA): add it to the home screen and it runs full-screen like a native app,
online or offline.

## Wat het doet / Features

- **Grote, leesbare kaarten** — één groot symbool + één grote hoekaanduiding.
- **Tik-om-te-spelen** — tik op een kaart en die verhuist vanzelf naar de beste plek.
  Geen precies slepen nodig.
- **Onbeperkt terugnemen** (Terug-knop) en een **Hint**-knop.
- **Makkelijk of moeilijker** — 1 kaart of 3 kaarten per keer (Instellingen).
- **Werkt liggend én staand**, en **offline**.
- **Geen advertenties, geen accounts, geen tracking.**

## Op de iPad/tablet zetten (installeren)

1. Open de gepubliceerde link in **Safari** (iPad) of **Chrome** (Android).
2. iPad: tik op het deelicoon → **Zet op beginscherm**.
   Android: menu (⋮) → **App installeren** / **Toevoegen aan startscherm**.
3. Start voortaan via het icoon op het beginscherm — schermvullend, zonder browserbalk.

## Ontwikkelen / Development

```bash
npm install
npm run dev          # start op http://localhost:5178 (of de getoonde poort)
npm run build        # productie-build in dist/
npm run preview      # bekijk de build lokaal
```

### Tests

```bash
npm test             # unit tests van de spelregels (Vitest)
npm run test:e2e     # UI-tests in de browser (Playwright, landscape + portrait)
npm run check        # TypeScript / Svelte type-check
```

### Iconen opnieuw genereren

De PWA-iconen worden uit `public/favicon.svg` gemaakt:

```bash
node scripts/gen-icons.mjs
```

## Architectuur

- `src/lib/engine/` — **pure spellogica** (geen UI). Volledig getest. Hier zit de
  hele kaartlogica; dezelfde motor kan later andere spellen aandrijven.
- `src/lib/stores/` — Svelte-state: het lopende spel (met undo/timer) en instellingen.
- `src/lib/components/` — de schermen en de kaart-weergave.
- `src/lib/games/registry.ts` — lijst met spellen op het startscherm (voeg hier nieuwe toe).
- `tests/e2e/` — Playwright UI-tests.

## Hosting

Automatisch via **GitHub Pages**: elke push naar `main` bouwt en publiceert
(`.github/workflows/deploy.yml`). Het basispad wordt afgeleid van de repositorynaam,
dus het werkt ongeacht hoe de repo heet. CI (`ci.yml`) draait bij elke push/PR de
unit- en UI-tests plus een build.

De build is statisch — je kunt de inhoud van `dist/` ook op elke eigen webserver
(met HTTPS) zetten.
