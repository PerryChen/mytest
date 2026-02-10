# Velotric Training Game

## Project Overview
- Velotric e-bike training game: visual novel + quiz, mobile-first
- Vanilla JS, no build tools, no frameworks
- Live site: `http://43.139.180.191`
- Version constant: `APP_VERSION` in `game.js` line 14 (currently v3.5.5)

## Architecture

### Core Files
| File | Role |
|------|------|
| `game.js` | Main game controller, version, makeChoice(), playDialogue() |
| `core/GameEngine.js` | State management, save/load |
| `core/UIManager.js` | All UI rendering (large file, ~1000 lines) |
| `core/StoryLoader.js` | JSON chapter loader + knowledge card methods |
| `core/EndingsManager.js` | 3-tier ending system |
| `core/AssessmentEngine.js` | Quiz/assessment mode |
| `core/AnalyticsManager.js` | Event tracking (localStorage + Supabase) |
| `config.js` | Supabase credentials + admin password (**gitignored, do NOT commit**) |

### Data Files
| Path | Content |
|------|---------|
| `data/scripts/chapter_N.json` | Main storyline dialogue trees (8 chapters) |
| `data/knowledgeCards.json` | 12 knowledge cards with categories/tiers |
| `data/dlcs/registry.json` | DLC registry (lists all available DLCs) |
| `data/dlcs/hr_onboarding/manifest.json` | HR DLC manifest (6 chapters, 8 knowledge cards) |
| `data/dlcs/hr_onboarding/hr_chapter_N.json` | HR DLC chapter scripts (1-6) |

### DLC System
- DLC chapter IDs use string format: `dlc_{dlc_id}_{N}` (e.g. `dlc_hr_onboarding_3`)
- Main game chapter IDs are numeric (1-8)
- DLC state is isolated: main game state is saved/restored around DLC play
- Chapter scores tracked in `GameEngine.state.chapterScores` keyed by chapter ID

### Analytics Events
| Event | Context | Key Properties |
|-------|---------|---------------|
| `game_launch` | App start | referrer, userAgent, screen |
| `chapter_start` | Main chapter begins | chapter_id (numeric) |
| `chapter_complete` | Any chapter ends | chapter_id, +dlc_id/chapter_score for DLC |
| `game_complete` | Main storyline finished | score |
| `dlc_start` | DLC begins | dlc_id |
| `dlc_chapter_start` | DLC chapter begins | dlc_id, chapter_id, chapter_index |
| `dlc_complete` | DLC finished | dlc_id, score, unlocked_cards, achievements |
| `card_unlocked` | Knowledge card earned | card_id |

### Admin
- `admin/dashboard.html` — Analytics dashboard (Chart.js), main/DLC split views
- `admin/admin.html` — Admin panel (password protected via config.js)

## Deployment

### Workflow (when user says "发布")
1. Remind user of current version, recommend new version number
2. Update `APP_VERSION` in `game.js` line 14
3. `git add` changed files (**EXCLUDE config.js and deploy.sh**)
4. `git commit` with descriptive message
5. `git push origin main`
6. Server auto-pulls every 2 minutes via cron — no manual deploy needed

### Versioning
- Patch (+0.0.1): bug fix, content tweak
- Minor (+0.1.0): new feature, content update, new DLC chapter

### Server
- IP: 43.139.180.191 (Tencent Cloud Lighthouse)
- Web root: `/www/wwwroot/velotric`
- Cron: `*/2 * * * *` git pull from origin/main
- config.js on server is created manually (not in git)
- SSH does not work; use BT Panel WebShell via Tencent console

## Conventions

### Content Rules
- Main storyline = product development focus
- Marketing/GTM content = DLC only
- Answer pattern: A/B correct distribution balanced at 4:4
- Avoid referencing specific product model numbers (use series names like "Discover 系列")
- Assessment questions are reference only; business stakeholders will finalize

### CSS Rules
- Game screen: `height: 100vh; max-height: 100vh` (locked)
- Intro screen: `min-height: 100vh` (scrollable, not fixed)
- Choice feedback: `.correct-choice`, `.wrong-choice`, `.hint-correct`

### Chapter Script Format
- JSON with node IDs as keys, each node has `speaker`, `avatar`, `text`, `next`
- Choice nodes have `choices` array with `text`, `next`, `score`, `isCorrect`, `feedback`
- Conditional branches: `score_gte`, `card_unlocked` types
- Card unlock: `"unlockCard": "CARD_ID"` on a dialogue node
