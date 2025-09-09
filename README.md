# Budget & Forecast — ING-stijl (zonder logo's)

Een simpele, statische (alleen-frontend) tool om inkomsten en uitgaven te registreren, labels toe te kennen en een **forecast** te maken voor een **week, maand, kwartaal of jaar**. Alles wordt lokaal opgeslagen in je browser (`localStorage`).

> ⚠️ **ING-huisstijl**: deze UI gebruikt een **ING-achtig kleurenpalet** (oranje `#ff6200` en navy `#000066`) maar **géén logo's of merkmateriaal**.

## Functionaliteit
- ✅ Transactie toevoegen/bewerken via **popup** (inkomst/uitgave, datum, bedrag, label, notitie)
- ✅ **Labels** (bijv. autoverzekering, zorg, boodschappen, andere verzekeringen, hypotheek, kinderopvang, etc.)
- ✅ **Terugkerende** transacties (wekelijks/maandelijks/kwartaal/jaarlijks) + optionele einddatum
- ✅ **Filters**: periode (week/maand/kwartaal/jaar/aangepast), label en zoekveld
- ✅ **Forecast** per geselecteerde periode op basis van terugkerende posten
- ✅ **What‑if**: reken een **hypothetische aankoop** door op de forecast
- ✅ **Export/Import** van data als JSON
- ✅ Charts (donut + lijn) met [Chart.js](https://www.chartjs.org/) via CDN

## Snel starten (GitHub Pages)
1. Maak een **nieuwe repository** (bijv. `ing-style-budget-tool`).
2. Upload de bestanden `index.html`, `styles.css`, `app.js` en `README.md`.
3. Zet GitHub Pages aan: **Settings → Pages → Source: Deploy from a branch** en kies `main` (`/root`).
4. Bezoek de Pages-URL en gebruik de app.

## Data & privacy
- Data staat **alleen lokaal** in je browser (`localStorage`). Geen server, geen tracking.
- Gebruik **Exporteren** om een back-up (JSON) te maken. Importeren is ook mogelijk.

## Toelichting forecast
- De forecast telt de **terugkerende** transacties op die binnen de **geselecteerde periode** vallen.
- Niet-terugkerende transacties tellen **niet** mee in de forecast (wel in de perioderesultaten).
- Met **What‑if** kun je een eenmalige uitgave simuleren binnen de periode.

## Labels
Standaardlabels: salaris, freelance, toeslagen, boodschappen, hypotheek/huur, energie, water, internet, telefoon, autoverzekering, zorg, andere verzekeringen, brandstof, ov, onderhoud auto, kinderopvang, onderwijs, sport, uit eten, cadeaus, abonnementen, vakantie, overig.
Je kunt **vrij nieuwe labels typen** in het formulier; deze worden automatisch bewaard voor vervolg.

## Toetsenbord & toegankelijkheid
- **Esc** sluit de popup.
- Focus-styles en knoppen zijn toetsenbordvriendelijk.

## Kleuren (ING‑stijl, zonder logo's)
- Oranje: `#ff6200`
- Navy: `#000066`

> Bronnen die dezelfde hex‑codes vermelden: BrandColors en DesignPieces.

## Licentie
MIT — gebruik, breid uit of pas aan naar wens.
