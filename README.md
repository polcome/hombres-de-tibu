# 🦈 Hombres de Tibu

App del grup per a la votació mensual de **MVP i anti-MVP**, el **recompte d'entrenos**, el **dossier d'expedients** i les **cartes tipus FIFA**.

100% gratuïta: **GitHub Pages** (web) + **Supabase** (base de dades, pla gratuït).

## Què fa

- 🗳️ **Votació secreta**: cada mes, MVP i anti amb motiu obligatori. Els vots es guarden sense nom ni hora, així que ningú (ni l'admin) pot saber qui ha votat què. L'admin pot anul·lar paperetes errònies.
- 🐌 **Morosos**: comptador en directe de qui falta per votar i botó per avisar-los pel WhatsApp.
- 📁 **Dossier**: qualsevol pot obrir expedients (mèrits o faltes) sense iniciar sessió, signats o com a xivato anònim. Té reaccions i comentaris.
- 🏋️ **Entrenos**: +1 gym o +1 fora del gym. Rànquings, gràfiques i el recompte en el format de sempre per copiar al WhatsApp.
- 📜 **Acta automàtica**: es genera sola en tancar el mes a partir dels motius. També hi ha un botó per copiar un prompt per a ChatGPT o Claude.
- 🃏 **Cartes FIFA**: la mitjana evoluciona amb els entrenos, MVPs, antis, la participació i el dossier. Hi ha 16 cartes especials desbloquejables: TOTM, Riota del Mes, Icona, Persona Non Grata, Hat-trick, Pilota d'Or, Pilota de Fang…

## Posada en marxa (uns 15 minuts)

### 1. Supabase
1. Crea un compte a <https://supabase.com> i un projecte nou (pla Free, regió Europe).
2. **SQL Editor** → enganxa `supabase/schema.sql` → *Run*.
3. Enganxa `supabase/seed.sql` → *Run* (crea els 13 membres, el recompte 2026 i fa admin al Come).
4. **Authentication → Sign In / Providers → Email**: desactiva **"Confirm email"** (els correus són ficticis, del tipus `josep@hombresdetibu.app`).
5. **Project Settings → API**: copia la *Project URL* i la clau *anon public*.

### 2. GitHub Pages
1. Al repo: **Settings → Secrets and variables → Actions → Variables** → crea `SUPABASE_URL` i `SUPABASE_ANON_KEY`.
2. **Settings → Pages → Source: GitHub Actions**.
3. **Actions → Deploy a GitHub Pages → Run workflow**. L'app queda a `https://<usuari>.github.io/hombres-de-tibu/`.

### 3. Activar els comptes
A **⚙️ Admin → Membres** cadascú té un codi d'activació. Amb "copiar missatge" s'envia per WhatsApp i cadascú tria la seva contrasenya a "Primer cop".

## Cada mes
1. Durant el mes: la gent s'apunta entrenos i obre expedients.
2. Últim dia: **Admin → Obrir votació** (amb data límit).
3. L'endemà: **Admin → Tancar i publicar**. Es calculen els guanyadors (en cas d'empat, guanyen tots), s'obre el mes següent i l'acta queda llesta per enviar.

## Desenvolupament
```bash
npm install
npm run dev     # sense .env.local → mode demo (contrasenya "tibu")
```
