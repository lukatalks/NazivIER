# NazivIER – Audit zoper Pravilnik IER (predlog 26. 5. 2026)

Datum revizije: 2026-05-27.
Vir resnice: `docs/pravilnik.docx` (predlog 26. 5. 2026) + `docs/Tipologija_slv.pdf` (COBISS tipologija).

---

## 1. Priloga 2 – Minimalni količinski pogoji (SOK + št. standardov)

Pregled vsakega naziva: izobrazba (SOK) in zahtevano število pogojev nacionalno/mednarodno primerljivih standardov.

| Naziv | Pravilnik SOK | NazivIER SOK | Standardov v pravilniku | NazivIER | Status |
|---|---|---|---|---|---|
| Znanstveni sodelavec | 10 | 10 | 1 | 1 | ✓ |
| Strokovno-raziskovalni sodelavec | 10 | 10 | 1 | 1 | ✓ |
| Razvojni sodelavec | 8 | 8 | 1 | 1 | ✓ |
| Višji znanstveni sodelavec | 10 | 10 | 2 | 2 | ✓ |
| Višji strokovno-raziskovalni sodelavec | 10 | 10 | 2 | 2 | ✓ |
| Višji razvojni sodelavec | 8 | 8 | 2 | 2 | ✓ |
| Znanstveni svetnik | 10 | 10 | 2 | 2 | ✓ |
| Strokovno-raziskovalni svetnik | 10 | 10 | 2 | 2 | ✓ |
| Razvojni svetnik | **9** | **9** | 2 | 2 | ✓ |

Vir: `src/lib/scoring/criteria.ts`. Vsi vnosi se ujemajo z Prilogo 2.

## 2. Priloga 3 – Pragovi posameznih standardov

### Znanstveni / Strokovno-raziskovalni nazivi

| Standard | Sodelavec | Višji sodelavec | Svetnik | Status |
|---|---|---|---|---|
| Pogoj 1 (ekvivalenti) | 3 / 3 | 10 / 10 | 18 / 18 | ✓ |
| Pogoj 2 – citati | 10 / 10 | 100 / 100 | 200 / 200 | ✓ |
| Pogoj 2 – ALI projekti izven ARIS > FTE | 0,5 / 0,5 | 3 / 3 | 5 / 5 | ✓ |
| Pogoj 3 – kum. FTE A | 1 / 1 | 5 / 5 | 10 / 10 | ✓ |
| Pogoj 3 – ALI let v vodilni funkciji | 1 / 1 | 2 / 2 | 3 / 3 | ✓ |

### Razvojni nazivi

| Standard | Sodelavec | Višji | Svetnik | Status |
|---|---|---|---|---|
| Pogoj 1 (ekvivalenti) | 2 / 2 | 5 / 5 | 18 / 18 | ✓ |
| Pogoj 2 – citati | 5 / 5 | 50 / 50 | 200 / 200 | ✓ |
| Pogoj 2 – ALI projekti izven ARIS > FTE | 0,5 / 0,5 | 3 / 3 | 5 / 5 | ✓ |
| Pogoj 3 – kum. FTE A | 1 / 1 | 5 / 5 | 10 / 10 | ✓ |
| Pogoj 3 – ALI let v vodilni funkciji | 1 / 1 | 2 / 2 | 3 / 3 | ✓ |

Operator strogo *»več kot«* (`> 0,5 FTE`) ohranjen v `evaluate.ts`:
`(externalProjectsFte ?? 0) > c.minExternalProjectsFte`. ✓

## 3. Priloga 3 – Pojasnila k merilom (uteži dosežkov)

### Utež 1,0

| Dosežek | NazivIER | Opomba |
|---|---|---|
| 1.01 Izvirni znanstveni članek v Q1/Q2 (1A1/1A2 v COBISS) | ✓ (dinamično) | Q1/Q2 detekcija heuristična – top kvartil 1.01/1.02 |
| 1.02 Pregledni znanstveni članek v Q1/Q2 | ✓ (dinamično) | enako |
| 1.16 Samostojni znanstveni sestavek/poglavje v monografski publikaciji | ✓ | |
| 2.01 Znanstvena monografija | ✓ | |
| 2.24 Patent s polnim preizkusom | ✓ | |
| Zaključeno mentorstvo pri doktoratu znanosti | ✓ (ročno) | Vnos prek polja »Dosežki uteži 1,0 brez tipologije« |
| Nacionalna ali mednarodna znanstvena priznanja in nagrade (Zois …) | ✓ (ročno) | enako polje |

### Utež 0,7

| Dosežek | NazivIER |
|---|---|
| 1.01 izven Q1/Q2 | ✓ (dinamično, fallback iz utež 1,0) |
| 1.02 izven Q1/Q2 | ✓ (dinamično) |
| 1.03 Drugi znanstveni članki | ✓ |
| 1.06 Objavljeni znanstveni prispevek na konferenci (vabljeno) | ✓ |
| 1.07 Objavljeni strokovni prispevek (vabljeno) | ✓ |
| 2.03 Univerzitetni/visokošolski/višješolski učbenik z recenzijo | ✓ |
| 2.18 Znanstveni film / zvočna ali video publikacija | ✓ |
| 2.21 Programska oprema | ✓ |
| 2.22 Nova sorta | ✓ |
| 2.27 Znanstveni terminološki slovar/enciklopedija/leksikon | ✓ |
| 2.28 Znanstvenokritična izdaja vira | ✓ |
| 2.31 Zbornik recenziranih znanstvenih prispevkov na mednarodni/tuji konferenci | ✓ |

### Utež 0,5

| Dosežek | NazivIER |
|---|---|
| 1.10 Objavljeni povzetek znanstvenega prispevka (vabljeno) | ✓ |
| 1.11 Objavljeni povzetek strokovnega prispevka (vabljeno) | ✓ |
| 2.02 Strokovna monografija | ✓ |
| 2.06 Slovar/enciklopedija/leksikon/priročnik/atlas | ✓ |
| 2.32 Zbornik na domači konferenci | ✓ |
| 3.14 Predavanje na tuji univerzi | ✓ |
| 3.16 Vabljeno predavanje na konferenci brez natisa | ✓ |
| Član uredništva znanstvene ali strokovne revije | ✓ (ročno) – polje »Dosežki uteži 0,5 brez tipologije« |
| Vodenje domačega ali tujega raziskovalnega projekta/programa | ✓ (ročno) – isto polje |

### Utež 0,3

| Dosežek | NazivIER |
|---|---|
| 1.04 Strokovni članek | ✓ |
| 1.05 Poljudni članek | ✓ |
| 1.08 Objavljeni znanstveni prispevek na konferenci | ✓ |
| 1.17 Samostojni strokovni sestavek | ✓ |
| 1.18 Strokovni sestavek v slovarju | ✓ |
| 1.26 Znanstveni sestavek v slovarju | ✓ |
| 2.04 Srednješolski/osnovnošolski učbenik z recenzijo | ✓ |
| 2.12 Končno poročilo o rezultatih raziskav | ✓ |
| 2.13 Elaborat, predštudija, študija | ✓ |
| 2.15 Izvedensko mnenje, arbitražna odločba | ✓ |
| 2.20 Raziskovalni podatki | ✓ |
| 2.23 Patentna prijava | ✓ |
| 2.30 Zbornik strokovnih/nerecenziranih prispevkov | ✓ |
| 2.33 Strokovni film / videoposnetek / zvočni posnetek | ✓ |
| Uredništvo posebne številke revije ali zbornika | ✓ (ročno) – polje »Dosežki uteži 0,3 brez tipologije« |

### Utež 0,1

Vseh 18 tipologij prisotnih: 1.09, 1.12, 1.13, 1.19, 1.20, 1.21, 1.22, 1.24, 1.25, 2.05, 2.07, 2.14, 2.19, 2.25, 3.11, 3.12, 3.15, 3.25. ✓

## 4. Faktor avtorstva (Priloga 3, tabela 2)

| Vloga | Faktor v pravilniku | NazivIER | Status |
|---|---|---|---|
| Edini avtor / prvi avtor / vodilni-korespondenčni / vodja projekta / glavni mentor / glavni urednik / edini nagrajenec | 1,0 | 1,0 | ✓ |
| Enakovredno avtorstvo / nagrada z več nagrajenci / somentor / sourednik | 0,7 | 0,7 | ✓ |
| Ostala soavtorstva | 0,3 | 0,3 | ✓ |

Privzeta vrednost, kadar avtorstvo ni eksplicitno označeno: **0,7** (enakovredno avtorstvo). Razlog: SICRIS bibliografski izvoz ne razkrije korespondenčnega avtorja. Uporabnik lahko ročno popravi na 1,0 za prvega / korespondenčnega avtorja, na 0,3 za drugo soavtorstvo.

## 5. Citati (Priloga 3, pojasnilo 2)

Pravilnik: »upoštevajo se citati znanstvenih del kandidata, za katere obstaja polni bibliografski zapis v COBIB.SI, povezan z zapisi citatnih baz Web of Science ali Scopus. Avtocitati se ne upoštevajo.«

NazivIER trenutno uporablja **OpenAlex `cited_by_count`**, ki agregira WoS, Scopus, Crossref in PubMed. **Avtocitati so vključeni**, zato so vrednosti tipično 5–15 % višje od strogo »čistih citatov«. To je dokumentirano v UI metodologiji in v `llms-full.txt`.

Načrtovana izboljšava: dodati OpenAlex `cited_by_count − self_citations` (na voljo prek `works.is_self_citation`) za eksaktno ujemanje s pravilnikom.

## 6. Logika štetja standardov

Pravilnik, 11. člen (3): »Kandidat ustreza standardom, če izpolnjuje vsaj **enega** (za sodelavca) oziroma vsaj **dva** (za III. in IV. karierno stopnjo) od **treh** pogojev.«

NazivIER:

```ts
const eligible = educationOk && standardsMet >= c.standardsRequired;
```

Vsi trije pogoji (Pogoj 1 = objavljeni dosežki, Pogoj 2 = citati ali projekti izven ARIS, Pogoj 3 = vodenje) štejejo enakovredno. Izpolnjenih ≥ zahtevanih → izvolljiv. ✓

Izobrazba je *hard gate* (stroga predpogoj), ne en izmed treh standardov. ✓

## 7. Znane omejitve (dokumentirane v UI + README)

| Področje | Omejitev | Akcija |
|---|---|---|
| Q1 / Q2 detekcija | Heuristika: top kvartil 1.01/1.02 po številu A1/2 v SICRIS Vrednotenju. | Načrtovan SCImago ISSN lookup. |
| Korespondenčni avtor | SICRIS ne razkriva. Privzeto 0,7. | Načrtovano parsanje COBISS XML; trenutno ročna označba. |
| Citati | OpenAlex vključuje avtocitate (5–15 % višje od strogo čistih). | Načrtovan filter `works.is_self_citation`. |
| Vodenje projektov (Pogoj 3) | Ni javnega vira; vnos je ročen. | Ohranja se kot ročno polje. |
| Ponovne izvolitve (22. člen) | »Polovica vrednosti od zadnje izvolitve« ni modelirana. | Načrtovano: vnos datuma zadnje izvolitve in tipa »ponovna izvolitev«. |
| Predčasna izvolitev (14. člen, 5. odst.) | Polje `yearsInResearchSector` se beleži, ne uporablja v izračunu. | Načrtovan informativni opozorilnik »upravičen do predčasne izvolitve«. |
| Odprta znanost (11. člen, 6.–8. odst.) | Ne preverja repozitorija. | Načrtovan check prek OpenAlex `is_oa`. |
| Asistentski nazivi | Ne ocenjujemo – le sodelavec in višje. | Po dogovoru: za asistenta velja samo izobrazbeni pogoj. |

## 8. Zaključek

Vsi kvantitativni pragovi iz Priloge 2 in Priloge 3 so v NazivIER implementirani **eksaktno**. Vse tipologije iz Pojasnil k merilom (1) so vključene v tabelo uteži. Faktorji avtorstva ustrezajo pravilniku. Logika kombinacije standardov (1 od 3 za sodelavca, 2 od 3 za III. in IV. karierno stopnjo) je pravilna.

Po reviziji 2026-05-27 so bila dodana tudi polja za ročne vnose ne-tipoloških dosežkov (mentorstva, znanstvene nagrade, uredništva, vodenje projektov), ki jih pravilnik šteje, vendar nimajo COBISS tipološke kode.

Preostale omejitve so dokumentirane v 7. poglavju in v `README.md`. Niso napake v implementaciji pravilnika, temveč izhajajo iz omejitev javnih virov podatkov (SICRIS, OpenAlex) ali iz dela pravilnika, ki zahteva ročno presojo (npr. ponovne izvolitve).
