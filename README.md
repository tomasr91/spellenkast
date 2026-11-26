# Quickplay

Een Android-app om webspelletjes te verzamelen (zoals Farflung en Krillion) en ze ín de app te spelen.

## Installeren op je telefoon

1. Ga op je telefoon naar **Releases → Quickplay (laatste versie)** in deze repo.
2. Tik op `Quickplay.apk` om hem te downloaden.
3. Open het bestand. Android vraagt één keer of je browser apps mag installeren: sta dat toe.
4. Open **Quickplay**.

Bij elke wijziging op `main` bouwt GitHub Actions automatisch een nieuwe APK. Installeer die gewoon over de oude heen; je spellenlijst blijft bewaard.

## Gebruik

- Tik op een cassette om het spel te openen. Met **Terug** of de terugknop van je telefoon ga je terug naar de kast.
- **+ Spel toevoegen**: naam en webadres invullen.
- **Bewerken**: spellen verwijderen.

## Hoe het werkt

- `www/index.html` – de kast (opmaak en markup)
- `src/main.js` – logica; wordt met esbuild gebundeld naar `www/app.js`
- `android/` – het Android-project (Capacitor 8)
- Spellen openen via `@capacitor/inappbrowser` in een ingebouwde WebView, dus ook sites die insluiten in een iframe verbieden werken.

Lokaal bouwen (optioneel, met Android Studio):

```bash
npm ci
npm run sync
npx cap open android
```
