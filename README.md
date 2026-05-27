# NazivIER

Interno orodje **Inštituta za ekonomska raziskovanja** za samodejen izračun
raziskovalnih nazivov po novem **Pravilniku o raziskovalnih nazivih na IER**
(predlog 26. 5. 2026).

Cilj: kandidatkam in kandidatom za izvolitev v naziv prihrani 2+ uri ročnega
zbiranja in vrednotenja bibliografije. Vrednost vsake publikacije izračuna
neposredno iz SICRIS-a, jo združi po Prilogi 3 pravilnika in pokaže transparentno
razčlenitev pogojev.

## Kako deluje

1. **Vir podatkov.** Bibliografija se v živo pridobi iz javnega COBISS
   bibliografskega API-ja
   (`bib.cobiss.net/biblioweb/authorCobissList/si/slv/cris/{ID}`) – zajame vse
   publikacije s tipologijo, letom in COBISS identifikatorjem.
2. **Izračun ekvivalentov.** Po pravilniku, Priloga 3:
   `ekvivalent = utež dosežka × faktor avtorstva`. Uteži so vezane na COBISS
   tipologijo (1,0 za Q1/Q2 članke, monografije, patente; 0,7 za druge
   znanstvene članke; …).
3. **Citati.** Privzeto se uporabijo čisti citati po Web of Science, alternativno
   Scopus. Trenutno se vnesejo ročno (SICRIS HTML strani so JS-renderirane); v
   naslednji različici jih bo orodje pridobivalo prek OpenAlex API-ja.
4. **Faktor avtorstva.** SICRIS bibliografski izvoz ne razkrije korespondenčnega
   avtorja, zato je privzeto 0,7 (enakovredno avtorstvo). Uporabnik lahko za
   posamezno publikacijo nastavi 1,0 (prvi/korespondenčni) ali 0,3 (drugo
   soavtorstvo).
5. **Razčlenitev.** Za vsak naziv od sodelavca navzgor orodje pokaže pogoj 1
   (objavljeni dosežki / ekvivalenti), pogoj 2 (citati ALI vrednost projektov
   izven ARIS) in pogoj 3 (sposobnost vodenja), ter listo prispevkov posameznih
   publikacij.

## Razvoj

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build
pnpm exec tsc --noEmit
```

## Arhitektura

- `src/lib/scoring/` — domenska logika (uteži, faktorji avtorstva, pragi,
  evalvacija). Pure TS, brez I/O.
- `src/lib/sicris/` — HTTP klienti za COBISS/SICRIS in parserji.
- `src/lib/types/` — skupni domenski tipi.
- `src/app/api/` — Next.js API rute (`/api/researcher`, `/api/roster`).
- `src/components/` — React klientske komponente za UI.

## Metodologija

Polna izvirna metodologija je v `docs/pravilnik.docx` (predlog z dne 26. 5. 2026)
in `docs/Tipologija_slv.pdf` (COBISS tipologija dokumentov/del).

## Omejitve trenutne različice

| Polje | Status | Naslednji korak |
|---|---|---|
| Bibliografija s tipologijo | ✅ samodejno iz SICRIS | – |
| Q1 / Q2 status (1A1 / 1A2) | ⚠️ ročno (privzeto »ostali«) | OpenAlex journal lookup |
| Korespondenčni avtor | ⚠️ ročno (privzeto 0,7) | dopolnitev iz COBISS XML |
| Čisti citati WoS / Scopus | ⚠️ ročno | OpenAlex `cited_by_count` |
| Vodenje projektov (FTE) | ⚠️ ročno | brez vira – ostane vnos |
| Vodilna funkcija (let) | ⚠️ ročno | brez vira – ostane vnos |
