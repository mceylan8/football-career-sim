# Football Career Sim — Projekthandbuch

> Dieses Dokument ist der vollständige Projektkontext. Bei Nutzung in Cursor: als Datei ins Repo-Root legen (z.B. `PROJECT.md`) und in `.cursorrules` / Chat referenzieren, damit die Architektur- und Datenentscheidungen konsistent eingehalten werden.

---

## 1. Konzept

Roguelike Fußball-Karriere-Simulator im Browser, inspiriert von Copero's "Simulador de Carrera", aber mit strukturell verzweigten Entscheidungen statt linearem Woche-für-Woche-Menü — angelehnt an Slay the Spire: pro Saison eine generierte Node-Map mit mehreren sichtbaren, unterschiedlichen Pfaden (Match, Sponsor, Transfer, Verletzungsrisiko, Medien-Event, Trainingslager, Agenten-Meeting, Rivalen-Challenge), zwischen denen strategisch gewählt wird, bevor der Ausgang bekannt ist.

**Differenzierung zur Konkurrenz** (BitLife-Klone, Football Life Simulator, BallerLife etc.): die meisten dieser Spiele haben einen kleinen statischen Event-Pool, der sich schnell wiederholt, und reine RNG-Matches ohne echten Stat-Bezug. Der Hebel hier: stat-gekoppelte Match-Simulation + datengetriebene, kontextabhängige Event-Engine statt fixer Liste.

---

## 2. Tech-Stack

- **Frontend**: React + Vite (TypeScript-Template)
- **State**: Zustand (reicht, kein Redux nötig)
- **Hosting**: GitHub Pages (reiner Static Build, `vite build` → `gh-pages` Branch, GitHub Actions Workflow)
- **Save**: initial localStorage; optional später Supabase für Cross-Device-Save/Leaderboard

---

## 3. Architektur — Kernbausteine

```
State: karriere (age, week, stats{tech, phys, mental}, club, contract, form, reputation, finances)
  traits: Trait[]        // Modifikatoren, die Spielstil pro Run verändern
  flags: Set<string>     // für verzögerte Konsequenzen (Entscheidung heute → Event in 3 Runden)
  seasonMap: Node[][]    // generierte Struktur pro Saison, nicht flache Event-Liste

Node-Typen: MATCH | SPONSOR | TRANSFER_OFFER | INJURY_RISK | MEDIA_EVENT
            | TRAINING_CAMP | AGENT_MEETING | RIVAL_CHALLENGE | REST

Event-Engine: datengetrieben statt hardcoded
  events: Array<{
    id, conditions: (state) => bool,
    weight: number,
    choices: [{ label, effects: (state) => newState, followUps? }]
  }>

Match-Simulation: stat-basiert statt pure RNG
  performance = f(form, stats, opponent_stats, position) + noise
```

---

## 4. Roguelike-Elemente

- Sichtbare Map vor der Wahl (Icons pro Node-Typ), strategische Vorab-Entscheidung statt nur reaktiv
- Permadeath-artiges Ende (schwere Verletzung, Vertragsende ohne Angebot, Reputationskollaps) statt garantiertem Durchlauf bis 38
- Meta-Progression zwischen Runs (Unlocks/Perks, z.B. "Startet mit Sponsor-Kontakt")
- Traits/Relics als sammelbare Modifikatoren während des Runs (z.B. "Krisenfest": Medienskandale -50%, Sponsoren zahlen -20%)

---

## 5. Vereins-/Liga-Daten

**Entscheidung**: keine Liga-Simulation nötig (andere Vereine spielen nicht wirklich gegeneinander) — nur ein glaubwürdiger, statischer Datenpool für Vertragsangebote, Gegner-Namen und Aufstiegsziel. Kein Live-API-Call zur Laufzeit — alles wird einmalig als statische `clubs.json` ins Repo eingefroren.

**Ursprünglich geprüfter Ansatz** (verworfen zugunsten einer direkt kuratierten Liste): openfootball (GitHub, statische Namen/Struktur) + ClubElo API (kostenlose Elo-Ratings, kein Key nötig) mergen. Geprüft, aber nicht gewählt: TheSportsDB (Free-Tier zu eingeschränkt), football-data.org (nur Top-Ligen), api-football.com (Free-Tier zu knapp für Bulk-Export). Der Merge-/Fetch-Workflow bleibt als Option für später (Nice-to-have-Phase, falls echte Elo-Werte gewünscht sind), ist für den MVP aber nicht nötig — die Klublisten unten sind bereits final und aktuell (Saison 2026/27).

### Gewählte Struktur: 5 Ligen, 5 Tiers

| Tier | Liga | Land | Rating-Range (Platzhalter) |
|---|---|---|---|
| 1 | Bundesliga | DE | ~1700–2000 |
| 2 | Premier League | EN | ~1750–2050 |
| 3 | Serie A | IT | ~1650–1950 |
| 4 | Süper Lig | TR | ~1500–1750 |
| 5 | 2. Bundesliga | DE | ~1450–1700 |

Rating pro Klub grob interpoliert: `baseRating = tierBase + random(-100, +100)`, später ggf. gegen echte ClubElo-Werte ersetzbar (Interface bleibt gleich: `{id, name, tier, rating}`).

### Bundesliga (DE) — Tier 1, 18 Klubs
FC Augsburg, Union Berlin, Werder Bremen, Borussia Dortmund, SV Elversberg, Eintracht Frankfurt, SC Freiburg, Hamburger SV, TSG Hoffenheim, 1. FC Köln, RB Leipzig, Bayer Leverkusen, Mainz 05, Borussia Mönchengladbach, Bayern Munich, SC Paderborn, Schalke 04, VfB Stuttgart

### Premier League (EN) — Tier 2, 20 Klubs
Arsenal, Aston Villa, Bournemouth, Brentford, Brighton & Hove Albion, Chelsea, Crystal Palace, Everton, Fulham, Liverpool, Manchester City, Manchester United, Newcastle United, Nottingham Forest, Sunderland, Tottenham Hotspur, Leeds United, Coventry City, Ipswich Town, Hull City

### Serie A (IT) — Tier 3, 20 Klubs
Atalanta, Bologna, Cagliari, Como, Fiorentina, Frosinone, Genoa, Inter Milan, Juventus, Lazio, Lecce, AC Milan, Monza, Napoli, Parma, Roma, Sassuolo, Torino, Udinese, Venezia

### Süper Lig (TR) — Tier 4, 18 Klubs
Galatasaray, Fenerbahçe, Beşiktaş, Başakşehir, Kasımpaşa, Eyüpspor, Trabzonspor, Göztepe, Samsunspor, Çaykur Rizespor, Konyaspor, Kocaelispor, Alanyaspor, Gaziantep FK, Gençlerbirliği, Erzurumspor FK, Amed Sportif Faaliyetler, Çorum FK

### 2. Bundesliga (DE) — Tier 5, 18 Klubs
Hertha BSC, Arminia Bielefeld, VfL Bochum, Eintracht Braunschweig, Energie Cottbus, Darmstadt 98, Dynamo Dresden, Greuther Fürth, Hannover 96, 1. FC Heidenheim, 1. FC Kaiserslautern, Karlsruher SC, Holstein Kiel, 1. FC Magdeburg, 1. FC Nürnberg, VfL Osnabrück, FC St. Pauli, VfL Wolfsburg

**Gesamt: 94 Klubs über 5 Ligen/Tiers.** Stand: Saison 2026/27 (September 2026).

**Hinweis Namens-Encoding**: türkische Sonderzeichen (ş, ç, ı, ğ) korrekt als UTF-8 in der JSON halten — bei ASCII-Normalisierung (z.B. für Suchfilter) separat behandeln, nicht die Anzeige-Namen verändern.

---

## 6. Datenmodell (TypeScript)

```ts
// types/club.ts
export interface Club {
  id: string;
  name: string;
  country: string;
  league: string;
  tier: number;        // 1-5
  rating: number;       // synthetisch interpoliert, später ggf. echte Elo
}

// types/player.ts
export interface PlayerState {
  age: number;
  week: number;
  season: number;
  stats: { tech: number; phys: number; mental: number };
  form: number;
  reputation: number;
  finances: number;
  club: Club | null;
  contract: { yearsLeft: number; wage: number } | null;
  traits: Trait[];
  flags: Set<string>;
}

// types/node.ts
export type NodeType =
  | "MATCH" | "SPONSOR" | "TRANSFER_OFFER" | "INJURY_RISK"
  | "MEDIA_EVENT" | "TRAINING_CAMP" | "AGENT_MEETING"
  | "RIVAL_CHALLENGE" | "REST";

export interface SeasonNode {
  id: string;
  type: NodeType;
  connections: string[];   // IDs der erreichbaren Folge-Nodes
  data?: Record<string, unknown>;
}

// types/event.ts
export interface GameEvent {
  id: string;
  conditions: (state: PlayerState) => boolean;
  weight: number;
  choices: EventChoice[];
}

export interface EventChoice {
  label: string;
  effects: (state: PlayerState) => Partial<PlayerState>;
  followUps?: { eventId: string; delayWeeks: number }[];
}
```

---

## 7. Match-Simulation (MVP-Formel)

```ts
performance = (playerRating * 0.6 + form * 0.4) - opponentRating + noise(-10, 10)
```

Reicht fürs MVP, wird später um Position/Gegnerformation erweitert.

---

## 8. Projekt-Setup

```bash
npm create vite@latest football-career-sim -- --template react-ts
cd football-career-sim
npm install zustand
npm install -D gh-pages
```

`vite.config.ts` → `base: '/football-career-sim/'` setzen (sonst brechen Pfade auf GitHub Pages).

`package.json` Scripts ergänzen:
```json
"predeploy": "npm run build",
"deploy": "gh-pages -d dist"
```

GitHub Actions Workflow (`.github/workflows/deploy.yml`) früh aufsetzen, damit jeder Push auf `main` automatisch baut und deployed.

### Ordnerstruktur

```
src/
  data/
    clubs.json
    events.json
  types/
    club.ts
    event.ts
    player.ts
    node.ts
  engine/
    matchSim.ts
    eventEngine.ts
    mapGenerator.ts
  state/
    careerStore.ts        // Zustand store
  components/
    SeasonMap.tsx
    NodeCard.tsx
    EventModal.tsx
    StatsPanel.tsx
  App.tsx
```

---

## 9. Feature-Liste

### Must-Haves (MVP, ohne das kein spielbares Produkt)
- Zeit-/Saison-Loop (Alter/Season-Counter)
- Kern-Stats (technisch/physisch/mental, Form, Reputation, Finanzen) + einfache Wechselwirkungs-Formeln
- Event-/Node-System mit 30-50 unterschiedlichen Events zum Start (Einstieg: 10-15 Events, dann ausbauen)
- Stat-reaktive Match-Simulation (siehe Abschnitt 7)
- Vereins-/Liga-Struktur: 5 Ligen, 5 Tiers, 94 Klubs (siehe Abschnitt 5) — bereits final für MVP
- Vertragslogik (Angebot annehmen/ablehnen, Laufzeit, Ende → neues Angebot oder Karriereende)
- Ende-Zustand (Alter, Verletzung, vertragslos ohne Angebot)
- Save/Load (mind. localStorage)
- Roguelike-Grundgerüst: sichtbare Map mit 2-3 wählbaren Pfaden pro Runde

### Nice-to-Haves (Tiefe/Politur, Spiel läuft auch ohne)
- Echte Elo-Ratings statt synthetischer Werte (ClubElo-Merge nachrüsten)
- Meta-Progression zwischen Runs (Unlocks, Perks)
- Traits/Relic-System
- Sponsoring-/Investment-Mechanik (Krypto, Aktien, Immobilien)
- Verzögerte Konsequenzen/Flags (Entscheidung triggert Event N Runden später)
- Rivalen-/NPC-System mit wiederkehrenden Charakteren (Agent, Rivale, Trainer)
- Statistik-/Career-Summary am Ende (Hall of Fame, Run-Vergleich)
- Cloud-Save/Leaderboard (Supabase)
- Sound/Musik, Match-Highlight-Animationen
- Mobile-optimiertes Layout
- Prozedurale Namensgenerierung für Spieler/Vereine
- Schwierigkeitsgrade / New-Game-Plus-Modifikatoren

---

## 10. Vorgeschlagene Reihenfolge

1. Types (Abschnitt 6) + `careerStore.ts` (Zustand) — leerer State, keine UI
2. `clubs.json` aus den Listen in Abschnitt 5 bauen (94 Klubs, Ratings synthetisch nach Formel)
3. `mapGenerator.ts` — pro Saison eine simple Node-Struktur (3-4 Reihen, 2-3 Nodes pro Reihe)
4. `SeasonMap.tsx` — Map rendern, Klick wählt Node
5. `eventEngine.ts` + `EventModal.tsx` — erste 10-15 Events testbar
6. `matchSim.ts` einbinden für MATCH-Nodes
7. Contract-Logik, Ende-Zustand
8. Deploy-Workflow scharf schalten, sobald 1x durchspielbar
9. Danach: Content/Nice-to-Haves draufsetzen (Abschnitt 9)
