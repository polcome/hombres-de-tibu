# Hombres de Tibu — context per a Claude

App web del grup d'amics del gimnàs "Los Hombres de Tibu" (13 membres). Serveix per a la votació mensual de MVP i anti-MVP, el recompte d'entrenos, un dossier d'expedients i cartes tipus FIFA. Tot és comèdia entre amics.

- **Idioma:** tota la UI, els textos i els missatges de commit en **català** (col·loquial i amb humor). Parla en català amb l'usuari.
- **Admin / propietari:** Come (usuari `come`, GitHub `polcome`). Ell decideix.
- **Web:** https://polcome.github.io/hombres-de-tibu/
- **Cost:** ha de ser 100% gratuït. Res de serveis de pagament ni d'APIs d'IA de pagament.

## Stack
- Vite + React 19 + TypeScript, CSS propi (`src/index.css`, tema fosc). No hi ha cap framework CSS.
- `react-router-dom` amb **HashRouter** (perquè funcioni a GitHub Pages) i `html-to-image` per descarregar les cartes.
- Backend: **Supabase** (Postgres + Auth + Storage), pla gratuït, cridat directament des del client amb la clau anon. La seguretat la donen **RLS i funcions RPC** (`supabase/schema.sql`).
- Deploy: GitHub Actions → GitHub Pages (`.github/workflows/deploy.yml`) a cada push a `main`. Les variables de repo `SUPABASE_URL` i `SUPABASE_ANON_KEY` s'injecten com a `VITE_SUPABASE_*`.
- Sense aquestes variables, l'app arrenca en **mode demo** (`src/api/demo.ts`): dades d'exemple a localStorage, contrasenya "tibu" per a tothom, i Come és l'admin.

## Estructura
- `src/api/types.ts`: interfície `Api`. N'hi ha dues implementacions, `supabase.ts` i `demo.ts`, que **s'han de mantenir en paral·lel**.
- `src/store.tsx`: carrega tota la BD d'un cop (`loadAll`), exposa `useStore()` i `useAction()`, i després de cada acció recarrega les dades.
- `src/logic/stats.ts`: totals, valoració FIFA (`rating`), cartes especials (`CARD_DEFS`, `unlockedCards`) i `photoFor`. Tot es **calcula al client**.
- `src/logic/acta.ts`: genera l'acta del mes amb plantilles (sense IA) i el "prompt per a IA" per enganxar a ChatGPT o Claude.
- `src/logic/months.ts`: utilitats de mesos (`'YYYY-MM'`).
- `src/pages/*`: Home, Dossier, Vote, Trainings, Cards, Palmares, MonthPage, Player, Admin, Login.
- `src/components/*`: FifaCard + CardArt (plantilles SVG) + fifa.css, CardZoom (pop-up de cartes d'assoliment), Album (àlbum de cromos), PhotoEditor (encuadrar), PhotoControls, CameraCapture (càmera dins l'app amb getUserMedia), TrainingItem, ui.

## Decisions de disseny (no les canviïs sense preguntar)
- **Vot 100% secret:** la taula `ballots` no té votant ni data, i `voters` només guarda qui ha votat. Es vota per la RPC `cast_vote`.
  - No et pots votar a tu mateix, el MVP i l'anti han de ser persones diferents i cada motiu ha de tenir mínim 15 caràcters.
  - L'admin veu les paperetes de forma anònima, les pot anul·lar i pot esborrar un votant perquè torni a votar.
- **Tancar el mes:** ho fa la RPC `close_month`. En cas d'empat guanyen tots. Després s'obre el mes següent.
- **Comptes:** login amb usuari + contrasenya. L'email és fictici (`<slug>@hombresdetibu.app`) i a Supabase la confirmació d'email està desactivada.
  - L'alta es fa amb un codi d'activació (`member_secrets`) que valida el trigger `handle_new_user`.
- **Expedients:** cal sessió per publicar-los (RPC `post_expedient`), però el text surt anònim o signat amb un nom lliure. **Màxim 2 al dia per usuari** (dia de Madrid). La taula `expedient_posts` guarda qui i quin dia, però no quin expedient, perquè el xivato continuï sent anònim.
- **Reaccions:** cal sessió, i només **una per usuari i expedient** (`expedient_reactions`; tocar la mateixa la treu, tocar-ne una altra la canvia). El jsonb `expedients.reactions` és llegat (es va posar a zero).
- **Comentaris:** il·limitats, anònims i sense sessió.
- **Entrenos:** format "gym (fora)".
  - Hi ha un recompte inicial de 2026 amb `baseline = true`, que compta per a l'any però no per a cap mes.
  - **Foto obligatòria per a gym** (només ho controla el client) i opcional per a fora. Es pot fer amb la càmera de l'app o triar de la galeria.
  - Les fotos es comprimeixen a 1080px abans de pujar-les.
  - Les fotos de prova són **d'una sola visualització** per dispositiu (localStorage). L'autor i l'admin les poden veure sempre.
  - Validació del grup amb ✅/🧢. Un entreno és "dubtós" amb 3 o més 🧢 i més 🧢 que ✅. Continua comptant fins que l'admin l'esborri.
- **Cartes FIFA:** 5 estadístiques. La mitjana és 35% ENT + 15% CON + 20% MVP + 20% COM + 10% FOR (`WEIGHTS` a `stats.ts`). VOT i CAR es van treure.
  - **Tot és per any natural:** ENT = 40 + gym de l'any ÷ 4 i FOR = 35 + (fora de l'any + entrenos virtuals d'èxits) ÷ 3, acumulatius: s'omplen durant l'any (el recompte inicial es prorrateja per a dates anteriors a la seva), MVP = 63 + 9·MVPs de l'any, COM = 88 − 13·antis de l'any, CON amb les setmanes que comencen dins l'any. L'1 de gener tothom torna a zero. Les cartes guanyades es queden.
  - CON (constància): setmanes senceres de l'any amb 3+ entrenos **de gym** (`CON_WEEK_GYM`), només des que es registren entrenos a l'app. CON = 40 + 59·(½·bones/setmanes + ½·min(1, bones/52)) (`CON_FULL_WEEKS`): meitat % i meitat acumulat lineal, així un 2/2 (71) val menys que un 15/15 (78) i un 52/52 arriba a 99. Sense setmanes: 70.
  - L'explicació completa de les fórmules és a Cartes → Com funciona (`Cards.tsx`): si canvies una fórmula, actualitza-la també allà.
  - Nivells (`TIERS`): bronze <65, plata 65–69, plata brillant 70–74, or 75–79, or brillant ≥80.
  - Les bàsiques (bronze, plata, or i les seves versions brillants) són senzilles; les brillants porten reflex hologràfic i espurnes. Les especials tenen **disseny propi** fet amb SVG a `src/components/CardArt.tsx` (forma, fons i ornaments segons el concepte: carpa de circ, llorer d'icona, gespa del hat-trick, dorsal de cursa, llençol de fantasma…). Estils de text a `src/components/fifa.css`.
  - Cartes automàtiques: TOTM, Anti-MVP, Icona (3 MVPs), Anti-Icona (3 antis), Hat-trick (3 MVPs seguits), Pilota d'Or i Pilota de Platja (anuals, quan el desembre està tancat), Redemption, Doble Cara, GymRat (200 gym/any), Centurió (100 gym/any), 4x4 (100 fora/any), IronMan (15+ gym 3 mesos seguits), SuperMan (20+ gym 3 mesos seguits), Fantasma (mes sense gym) i Rei Fantasma (mes sense cap entreno; no dona també Fantasma).
  - **Versions PLUS i ULTRA** (`LEVEL_RULES` a `stats.ts`; mateix disseny + afegits a `LEVEL_BG`/`LEVEL_FG` de `CardArt.tsx`: PLUS = marc cromat lila, gemmes i cinta; ULTRA = marc irisat animat, flames, llamps, cinta negra i brillantor pulsant). Ids `<base>-plus` / `<base>-ultra`, amb `family` = id base. Llindars: Icona/Anti-Icona 6 i 10; Hat-trick 4 i 5 mesos seguits; Doble Cara 2+2 i 3+3 el mateix any; GymRat 225 i 250; 4x4 150 i 200; IronMan i SuperMan 5 i 8 mesos seguits; Fantasma i Rei Fantasma 2 i 3 mesos seguits. A la col·lecció es mostren al costat de la base, bloquejades fins que algú les aconsegueix. A la col·lecció les cartes van en mida petita (`size="xs"`, 3 per fila al mòbil) i en clicar-les s'obren en gran.
  - Les ratxes donen una carta per cada bloc complet de n mesos seguits (`streakHits`), no una per cada finestra.
  - Cartes especials: el `boost` se suma a la mitjana **i a cada una de les 5 stats** d'aquella carta (ho fa `FifaCard`); la carta base no es toca mai.
  - Valoració de les cartes especials: la de final del mes de la carta (congelada). Les anuals, o les d'un any sense cap dada d'entrenos a l'app, fan servir la valoració actual (`unlockMonth`).
  - Els ids de `CARD_DEFS` no es canvien encara que canviï el nom (hi van lligades les fotos de cartes).
  - **Èxits esportius** (manuals, taula `achievements`): ascens, mitja marató, marató i Hyrox. L'admin els dona des d'Admin a una o diverses persones amb el nom de l'esdeveniment (tots els que hi van tenen la mateixa carta). Tenen boost propi com les altres especials (Ascens i Mitja +3, Hyrox +4, Marató +6) i, a més, sumen entrenos fora **virtuals** al càlcul de FOR de la carta base durant l'any natural de l'èxit (`ACHIEVEMENT_FOR_BONUS`: 12/12/15/25); al recompte d'entrenos no hi surten.
- **Fotos de membres i cartes:** només l'admin les puja o les treu. N'hi ha una de base i una opcional per a cada carta especial (`card_photos`, clau `defId:mes|any`).
  - Les cartes base porten al perfil. Les cartes d'assoliment s'obren en gran en un pop-up.
- **Àlbum de cromos** (`src/components/Album.tsx`): al perfil hi ha una vista prèvia que obre un àlbum a pantalla completa. La portada té la carta base actual, el progrés (X/40) i un índex. Hi ha una pàgina per família (base + PLUS + ULTRA) i una per als èxits esportius, amb els buits bloquejats. Es passa pàgina lliscant o amb fletxes. L'admin hi posa les fotos de cada carta.
- **Descartat de moment** (l'usuari ho ha dit): minijocs, porra/Tibucoins, premis, comodins, rol "editor de fotos" i blindar la foto obligatòria a la BD.

## Supabase: scripts ja executats a producció
1. `supabase/schema.sql`
2. `supabase/seed.sql`: 13 membres, recompte 2026, mes 2026-10 i Come admin.
3. `supabase/palmares-2026.sql`: MVPs i antis de gener a setembre de 2026.
4. `supabase/migracio-fotos-cartes.sql`: taula `card_photos`.
5. `supabase/migracio-proves-entrenos.sql`: `trainings.photo_url`, `training_votes` i el bucket `proofs`.
6. `supabase/migracio-exits-esportius.sql`: taula `achievements`.
7. `supabase/migracio-limits-dossier.sql`: límit de 2 expedients/dia i 1 reacció per usuari (⚠️ pendent de confirmar que l'usuari l'ha executat).

Quan un canvi necessiti BD:
- Crea una **migració nova** `supabase/migracio-*.sql` que sigui idempotent (`if not exists`, `drop policy if exists`).
- Afegeix-la també a `schema.sql` per a instal·lacions noves.
- Fes que el client **no peti** si la migració encara no s'ha executat (vegeu com `loadAll` tolera `card_photos` i `training_votes`).
- Després digues a l'usuari que l'executi a Supabase → SQL Editor. Claude no té accés a la BD de producció.

Correspondència de noms (per al palmarès): Pol Come = `come`, Pol Sainz = `polsy`, Ferran Quintana = `fq`, Ferran Mateu Dos Santos = `ferran`, Arnau Deig = `deig`, Gerard Morales = `gerard`, Eduard Papaseit = `eduard`, Marc Sierra = `marc`, Josep Pareja = `josep`.

## Com treballar-hi
- `npm install`, `npm run dev` (mode demo) i `npm run build` (inclou `tsc -b`, que ha de passar sense errors ni variables sense usar).
- Prova els canvis visuals amb Playwright contra `npx vite preview` en mode demo, amb viewport de mòbil (390×844). L'usuari ho fa servir sobretot des del mòbil.
- Commits petits en català i push a `main` (desplega sol).
- Mantén l'estil del codi existent: components funcionals, sense punt i coma, cometes simples, text de la UI en català. Hi ha `.prettierrc` amb aquest estil (no formatis fitxers que no toques).
