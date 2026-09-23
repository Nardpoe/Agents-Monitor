# Agents Monitor

Monitor locale in browser per osservare Codex e Claude Code in tempo quasi reale.

![Agents Monitor](advanced-check.png)

## Cosa fa

- si apre in una finestra del browser dedicata
- finestra nera semitrasparente, agganciata a destra e configurabile in primo piano
- modalità compatta / espansa
- Codex: quota 5 ore e settimanale quando `rate_limits` è disponibile, burn rate, token/min, sessioni/agenti recenti
- Claude Code: token di sessione, token/min, sessioni recenti
- legge solo file locali; non invia dati a server esterni
- se Codex non scrive `rate_limits`, mostra `n/d` invece di stimare la quota

## Directory lette

- Codex: `~/.codex/sessions/**/*.jsonl`
- Claude Code: `~/.claude/projects/**/*.jsonl`

L'app non visualizza né memorizza il testo dei prompt. Il parser usa i record JSONL solo per estrarre metadati di utilizzo, modello e struttura delle sessioni.

## Avvio

Richiede Windows e Node.js 20 o successivo.

```bash
npm ci
npm start
```

Agents Monitor avvia un server accessibile solo dal computer locale e apre automaticamente Edge o Chrome. Per avviare soltanto il server:

```bash
npm run serve
```

Poi visita `http://127.0.0.1:4173`.

## Soglie colore iniziali

Burn Codex:

- verde: meno di 1 punto percentuale/minuto
- giallo: da 1 a meno di 3 punti percentuali/minuto
- rosso: 3 o più punti percentuali/minuto

Quota rimanente:

- verde: oltre 35%
- giallo: 16-35%
- rosso: 0-15%

Sono soglie UI, non soglie ufficiali OpenAI.

## Limiti v0.1

- La quota Claude dell'abbonamento non viene inventata: se non è disponibile nei log locali, l'app mostra solo token e attività.
- Il riconoscimento dei sub-agent Codex è euristico perché i campi possono variare tra versioni del client.
- Il parser iniziale legge al massimo gli ultimi 8 MB per file e poi prosegue incrementalmente, per evitare di caricare intere cronologie molto grandi.

## Privacy

Nessuna telemetria. Nessuna API esterna. Nessun upload. Tutto resta sul computer.

Il server ascolta soltanto su `127.0.0.1`: non espone l'interfaccia alla rete locale.

## Contribuire

Issue e pull request sono benvenute. Prima di proporre una modifica esegui:

```bash
npm test
npm run check
```

Vedi anche [CONTRIBUTING.md](CONTRIBUTING.md).

## Licenza

Distribuito con licenza MIT. Vedi [LICENSE](LICENSE).
