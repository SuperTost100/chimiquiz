# 🧪 Chimiquiz

[![GitHub Open Source](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-red.svg)](https://github.com/SuperTost100/chimiquiz)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Website](https://img.shields.io/badge/Website-Live-green.svg)](https://supertost100.github.io/chimiquiz/)

**Chimiquiz** è un simulatore web moderno ed elegante per esercitarsi con quiz di chimica. Il sito è completamente responsive, offre un design raffinato con effetto vetro (glassmorphism) ed è progettato per simulare le condizioni di un esame reale, integrandosi dinamicamente con le **API pubbliche di Poliquiz** per ottenere i quesiti.

Il simulatore è **completamente gratuito, open-source e accessibile a chiunque direttamente online**, senza alcuna necessità di installazione o configurazione locale:

👉 **[Accedi a Chimiquiz Online](https://supertost100.github.io/chimiquiz/)**

---

## ✨ Caratteristiche Principali

- **Simulazione Realistica dell'Esame**: Un timer integrato di 25 minuti con avvisi visivi dinamici a seconda del tempo rimanente.
- **Navigazione Avanzata**: Griglia laterale/menu interattivo per muoversi liberamente tra le 15 domande del test, monitorando visivamente lo stato di ciascun quesito (risposto, non risposto, contrassegnato).
- **Segnalibri (Flag/Contrassegno)**: Possibilità di contrassegnare le domande dubbie con una bandierina per ritrovarle rapidamente.
- **Deseleziona Risposta**: Cliccando nuovamente su una risposta già selezionata, questa viene rimossa, lasciando la domanda in bianco.
- **Smart Shuffle**: Algoritmo intelligente di selezione che evita di riproporre le stesse domande in sessioni consecutive. Memorizza le ultime 256 domande viste e dà priorità a quelle fresche. Dopo circa 17 sessioni il ciclo si rinnova automaticamente.
- **Blacklist Permanente**: Le domande segnalate e sostituite con "Cambia domanda" vengono escluse permanentemente per quell'utente, garantendo che non ricompaiano mai.
- **Segnalazione Domande**: Possibilità di segnalare domande errate o inappropriate sia durante il quiz sia nella schermata di revisione finale, con istruzioni passo-passo per la segnalazione su Poliquiz.
- **Cambia Domanda**: Dopo aver segnalato una domanda durante il test, è possibile sostituirla con una nuova domanda casuale.
- **Resoconto Dettagliato a Fine Test**:
  - Grafico circolare animato per mostrare il punteggio ottenuto.
  - Statistiche dettagliate: domande corrette, errate e saltate.
  - Accordion interattivo per rivedere ciascuna risposta con la correzione ufficiale passo dopo passo.
- **Aggiornamento Automatico**: Il sito verifica automaticamente la disponibilità di nuove versioni e mostra un banner non intrusivo con un pulsante per ricaricare.
- **Interfaccia Utente Curata**: Design moderno dark mode, animazioni fluide e layout flessibile ad alta leggibilità.
- **Sicurezza Antidispersione**: Avvisi prima dell'abbandono accidentale del test in corso (compreso il supporto al pulsante indietro o chiusura della scheda del browser).
- **Scorciatoie da Tastiera**:
  - `Freccia Destra` / `Freccia Sinistra` per navigare tra le domande.
  - Tasti da `1` a `5` per selezionare rapidamente le opzioni (A-E).
  - Tasto `F` per contrassegnare/rimuovere il flag da una domanda.

---

## 📐 Regole del Test

La simulazione adotta il formato e le penalità tipiche di molti test universitari italiani:

- **Numero di domande**: 15 quesiti a risposta multipla (5 opzioni).
- **Tempo massimo**: 25 minuti.
- **Punteggio Massimo**: 9.0 punti.
- **Criterio di Valutazione**:
  - Risposta corretta: **+0.60 punti**
  - Risposta errata: **-0.12 punti** (penalità del 20%)
  - Risposta non data / saltata: **0.00 punti**
- **Soglia di Superamento**: Il test è considerato superato con un voto **maggiore o uguale a 6.0/9.0**.

---

## 📂 Struttura del Progetto

Il progetto si compone di un'applicazione front-end statica ed efficiente:

```text
Chimiquiz/
├── index.html          # Struttura della Single Page Application (Home, Quiz, Risultati)
├── index.css           # Design System (variabili CSS, Glassmorphism, animazioni, layout)
├── app.js              # Motore logico, fetch da API pubblica Poliquiz, Timer, Keyboard Shortcuts
├── og-image.png        # Immagine per le anteprime social (Open Graph / Twitter Card)
└── README.md           # Questa documentazione
```

---

## 🛠️ Sviluppo ed Esecuzione in Locale

Se desideri clonare il progetto per scopi di sviluppo, personalizzazione o utilizzo offline:

1. Clona il repository:
   ```bash
   git clone https://github.com/SuperTost100/chimiquiz.git
   cd chimiquiz
   ```
2. Avvia un server web locale:
   - Con **Python**:
     ```bash
     python -m http.server 8000
     ```
   - Oppure con **Node.js (npx)**:
     ```bash
     npx serve
     ```
3. Apri il browser all'indirizzo `http://localhost:8000` (o la porta specificata dal server).

### 🔧 Comandi Console (per sviluppatori)

Apri la console del browser (Ispeziona → Console) e usa i seguenti comandi:

| Comando | Descrizione |
|---------|-------------|
| `chimiquiz.stats()` | Mostra statistiche: domande nel DB, nella cronologia recente e nella blacklist |
| `chimiquiz.resetBlacklist()` | Resetta la blacklist permanente delle domande segnalate |
| `chimiquiz.resetRecent()` | Resetta la cronologia recente, rendendo tutte le domande di nuovo "fresche" |

---

## 🤝 Contribuire

Vuoi proporre miglioramenti alla simulazione o al codice? Ogni contributo è il benvenuto!

1. Esegui il Fork del progetto.
2. Crea un branch per la tua feature (`git checkout -b feature/nuova-feature`).
3. Apporta le modifiche (ad esempio migliorando la logica in `app.js` o lo stile in `index.css`).
4. Esegui il commit e fai il push del tuo branch (`git push origin feature/nuova-feature`).
5. Apri una **Pull Request** spiegando i cambiamenti apportati.

---

## ✍️ Autore e Licenza

- **Sviluppato da**: [SuperTost100](https://github.com/SuperTost100)
- **Licenza**: [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0) — Sentiti libero di utilizzare, modificare e distribuire questo codice in conformità con i termini della licenza Apache 2.0.
- Il progetto è interamente **Open Source**. Se ti piace, lascia una stella ⭐ su GitHub!
