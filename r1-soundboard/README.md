# R1 Soundboard

Een zelfstandige rabbit r1 Creation waarmee je maximaal acht korte geluiden opneemt, lokaal bewaart en afspeelt.

## Bediening

| Actie | Touch | r1-hardware |
|---|---|---|
| Selecteren | Tik op een vak | Scrollwiel omhoog/omlaag |
| Afspelen | Tik op een gevuld vak | Korte druk op zijknop |
| Opnemen | Tik op REC en nogmaals om te stoppen | Houd zijknop ingedrukt; loslaten stopt |
| Hernoemen/exporteren/wissen | Knoppen onderaan | — |

Opnames stoppen automatisch na acht seconden. De limieten staan in `config.js`. Houd clips kort: Rabbit documenteert de precieze opslagcapaciteit van Creations niet.

## Lokaal testen

```sh
npm start
```

Open `http://localhost:4174/r1-soundboard/` wanneer de server vanuit de bovenliggende projectmap draait, of `http://localhost:4174/` als je de server in deze map start.

Tests:

```sh
npm test
```

## Hosting via GitHub Pages

De workflow `.github/workflows/pages.yml` publiceert bij iedere push naar `main` uitsluitend het soundboard en een kleine doorverwijspagina. De bestaande Creation-URL blijft:

```text
https://rabbit-r1.puntkoen.nl/r1-soundboard/
```

Stel de repository eenmaal zo in:

1. Open op GitHub **Settings → Pages**.
2. Kies bij **Build and deployment → Source** voor **GitHub Actions**.
3. Maak bij de DNS-provider voor `puntkoen.nl` een CNAME-record met naam `rabbit-r1` en doel `puntkoen.github.io`.
4. Verwijder eventueel bestaande A- en AAAA-records voor alleen `rabbit-r1` om conflicten te voorkomen.
5. Vul bij **Custom domain** `rabbit-r1.puntkoen.nl` in en schakel **Enforce HTTPS** in zodra dit beschikbaar wordt.

Het bestand `pages/CNAME` koppelt de gepubliceerde site aan het subdomein. De hoofd-URL stuurt automatisch door naar `/r1-soundboard/`. GitHub Pages levert de site via HTTPS zonder de blokkerende `microphone=()`-header van de vorige hosting.

Microfoonopname vereist HTTPS. Voeg geen Permissions-Policy toe die de microfoon uitschakelt, zoals:

```text
Permissions-Policy: microphone=()
```

## Installeren op r1

Wacht tot de Pages-workflow groen is en `https://rabbit-r1.puntkoen.nl/r1-soundboard/` het soundboard toont. Omdat de Creation-URL gelijk blijft, hoef je normaal geen nieuwe QR-code te maken. Sluit de Creation volledig af en open hem opnieuw nadat de DNS-wijziging actief is.

## Ondersteunde techniek

- microfoon en speaker via standaard mobiele web-API's (`getUserMedia`, `MediaRecorder`, `Audio`);
- scrollwiel en zijknop via de officiële Creation-events;
- persistente, per-Creation geïsoleerde `creationStorage`;
- geen backend, account of AI-verwerking;
- geluidsdata blijft lokaal binnen de Creation totdat je zelf exporteert.

Bron: [officiële Rabbit Creations SDK](https://github.com/rabbit-hmi-oss/creations-sdk).
