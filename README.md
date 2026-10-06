# Sally

En separat Sally-version av Girlification, byggd med HTML5 Canvas och JavaScript.

Den enda leveln heter **Sally** och utspelar sig under tre kvällar. Sally är en söt, blond vuxen tjej med valnötter som örhängen. Hon placerar chiliplantor, amplar, basilika och växtlampor i lägenheten. Sista kvällen kommer en stor växtlampa till hallen.

**Charma** ersätter den tidigare förmågan: lugnar irritation, stärker relationen och har 18 sekunders cooldown. Sallys porträtt, fyra riktningar och odlingsföremålen är AI-genererade. Lägenhet, möbler, spelarkaraktär och musik kommer från originalspelet.

## Spela lokalt

Kör `python -m http.server 8080` i den här mappen och öppna http://localhost:8080. Spelet använder JavaScript-moduler och behöver en lokal webbserver.

## Kontroller

- WASD: gå. E: föremålsval.
- 1: göm. 2: kompromissa/använd/flytta. 3: ta bort.
- F: aktuell specialåtgärd, inklusive Charma när irritation är minst 15 och förmågan är redo.
- B: stoppa en placering nära Sally. C: stabilisera ett rum.
- U: använd basilika eller växtlampa. Q: distrahera med rätt planeringskort.
- P/Esc: paus. H: hjälp. Xbox-handkontroll och pekkontroller stöds.

Sparfiler och profil har egna Sally-nycklar och är separata från originalspelet.

Sally har en gångcykel i fyra riktningar med växlande steg och armsving. Stegtakten följer avståndet hon faktiskt går. Vid stillastående används hennes vilopos; inställningen Minskade effekter stänger av gånganimationen. Spelaren har också ett mjukt stegstuds och en markskugga.

## Verifiering

`npm test` testar spelmekanik, Sally som enda level, odlingsföremål, Charma, sparning, scener och handkontroll. `npm run simulate` kör automatiska balansrundor för Sally.
