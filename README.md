# ORBIT fürs iPad

Eigenständige iPad-Version von ORBIT: ein persönlicher Puls fürs Studium und Privates,
mit Smiskis. Läuft **komplett auf dem iPad** als Web-App vom Home-Bildschirm – kein
Laptop, kein Server, keine Arbeitsdaten.

| Seite | Was sie kann |
|---|---|
| **Start** | Begrüßung nach Tageszeit, nächster Termin, Tagesband, wichtigste Aufgaben, Moodle-Fristen, Geburtstage, angeheftete Notizen, Frage an Claude |
| **Kalender** | Tag/Woche; Termine aus importierten `.ics`-Dateien (Vorlesungsplan, Moodle-Export, alles andere) |
| **Aufgaben** | anlegen, Priorität, Fälligkeit, abhaken; Überfälliges oben |
| **Notizen** | Markdown, anheften, suchen |
| **Personen** | Smiski pro Person (38 Posen), Tags, Notizen, Kontakt; `.vcf`-Import aus der Kontakte-App |
| **Fragen** | Claude mit eigenem **privaten** API-Key (Streaming, Verlauf, optional mit Tageskontext) – oder ohne Key „In Claude öffnen“ (claude.ai mit dem privaten Claude-Konto) |
| **Einstellungen** | Name, Pose, hell/dunkel, DE/EN, Leuchten, Animationen, API-Key, Modell, Backup |

## Daten

- Alles liegt in IndexedDB **auf dem iPad**. Nichts wird synchronisiert.
- Das Netz verlassen nur Claude-Anfragen – direkt an `api.anthropic.com`, nur wenn du fragst.
- **Backup:** Einstellungen → „Backup exportieren“ (JSON, ohne API-Key). Safari kann bei
  Speichermangel Website-Daten löschen; als Home-Bildschirm-App ist das selten, ein
  gelegentliches Backup in „Dateien“/iCloud schadet trotzdem nicht.
- **Kalender:** Moodle und der Vorlesungsplan erlauben keine direkten Browser-Abrufe
  (kein CORS). Deshalb: in Safari als `.ics` herunterladen → in ORBIT unter Kalender
  importieren. Erneuter Import derselben Datei (gleicher Name) ersetzt deren Termine.

## Aufs iPad bringen (GitHub Pages)

1. Privates GitHub-Konto (nicht das Firmenkonto), neues Repo, z. B. `orbit-ipad`.
   Für kostenlose Pages muss es **öffentlich** sein – der Code enthält keine
   persönlichen Daten, die liegen nur auf dem iPad.
2. ```bash
   cd ~/orbit-ipad
   git remote add origin https://github.com/<privates-konto>/orbit-ipad.git
   git push -u origin main
   ```
3. Im Repo: Settings → Pages → Source: **GitHub Actions**. Der Workflow
   `.github/workflows/pages.yml` testet, baut und veröffentlicht bei jedem Push.
4. Auf dem iPad in Safari `https://<privates-konto>.github.io/orbit-ipad/` öffnen →
   Teilen → **Zum Home-Bildschirm**. Danach startet ORBIT wie eine App, auch offline.

Updates: pushen, ORBIT auf dem iPad bei Internet einmal öffnen – die neue Version
wird geladen, die Daten bleiben.

## Claude

Privater Key von <https://console.anthropic.com> → Einstellungen → API-Key. Er bleibt
nur auf dem iPad und landet nicht im Backup. Standardmodell Claude Opus 5.5
(Sonnet 5.5 / Haiku 5.5 wählbar). Abgelehnte Anfragen laufen serverseitig über
`fallbacks: "default"` weiter. Ohne Key öffnet der Senden-Knopf die Frage samt
Kontext auf claude.ai.

## Entwickeln

```bash
npm install
npm run dev          # http://127.0.0.1:5180
npm test             # ICS-/vCard-Parser
npm run build        # dist/
npx vite preview --port 4190 &
PLAYWRIGHT_CORE=<pfad>/playwright-core node scripts/e2e.mjs     # Funktionstest (Claude-API simuliert)
PLAYWRIGHT_CORE=<pfad>/playwright-core node scripts/shots.mjs   # Screenshots iPad quer/hoch, hell/dunkel
PLAYWRIGHT_CORE=<pfad>/playwright-core npm run icons            # Home-Bildschirm-Icons neu rendern
```

Die Smiski-Bibliothek (`src/smiski/`) ist aus dem Desktop-ORBIT kopiert, nicht
verlinkt – das Repo ist eigenständig. Die Figuren sind eigene, vereinfachte
Fan-Zeichnungen für den privaten Gebrauch.
