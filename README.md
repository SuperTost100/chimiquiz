# 🧪 Chimiquiz

[![GitHub Open Source](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-red.svg)](https://github.com/SuperTost100/chimiquiz)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Website](https://img.shields.io/badge/Website-Live-green.svg)](https://supertost100.github.io/chimiquiz/)

**Chimiquiz** è un simulatore web moderno ed elegante per esercitarsi con quiz di chimica, basato su quesiti reali estratti da PDF accademici. Il sito è completamente responsive, offre un design raffinato con effetto vetro (glassmorphism) ed è progettato per simulare le condizioni di un esame reale.

Il simulatore è **completamente gratuito, open-source e accessibile a chiunque direttamente online**, senza alcuna necessità di installazione o configurazione locale:

👉 **[Accedi a Chimiquiz Online](https://supertost100.github.io/chimiquiz/)**

---

## ✨ Caratteristiche Principali

- **Simulazione Realistica dell'Esame**: Un timer integrato di 25 minuti con avvisi visivi dinamici a seconda del tempo rimanente.
- **Navigazione Avanzata**: Griglia laterale/menu interattivo per muoversi liberamente tra le 15 domande del test, monitorando visivamente lo stato di ciascun quesito (risposto, non risposto, contrassegnato).
- **Segnalibri (Flag/Contrassegno)**: Possibilità di contrassegnare le domande dubbie con una bandierina per ritrovarle rapidamente.
- **Selezione Casuale Pseudo-Deterministica**: Algoritmo PRNG (Mulberry32) basato su seed dinamico (il timestamp iniziale e, per le domande successive, l'ID della domanda precedente con offset per evitare collisioni). Questo garantisce un'estrazione equa e non ripetitiva per ogni sessione.
- **Resoconto Dettagliato a Fine Test**:
  - Grafico circolare animato per mostrare il punteggio ottenuto.
  - Statistiche dettagliate: domande corrette, errate e saltate.
  - Accordion interattivo per rivedere ciascuna risposta con la correzione ufficiale passo dopo passo.
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

Il progetto si compone di un'applicazione front-end statico estremamente efficiente e di una suite di script Python per l'elaborazione dei dati:

```text
Chimiquiz/
├── index.html          # Struttura della Single Page Application (Home, Quiz, Risultati)
├── index.css           # Design System (variabili CSS, Glassmorphism, animazioni, layout)
├── app.js              # Motore logico (gestione stato, PRNG Mulberry32, Timer, Keyboard Shortcuts)
├── quizzes.json        # Database di 447 quesiti unici estratti e ripuliti
├── extract/            # Script di estrazione dati dai PDF originali
│   ├── extract_quizzes.py  # Script basato su PyMuPDF per il parsing semantico dei PDF
│   ├── remove_duplicates.py # Script di deduplicazione semantica e normalizzazione
│   └── *.pdf               # PDF originali dei quiz
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
2. Avvia un server web locale rapido (necessario per caricare il file `quizzes.json` tramite `fetch` senza violare le policy CORS dei browser):
   - Con **Python**:
     ```bash
     python -m http.server 8000
     ```
   - Oppure con **Node.js (npx)**:
     ```bash
     npx serve
     ```
3. Apri il browser all'indirizzo `http://localhost:8000` (o la porta specificata dal server).

---

## 🐍 Pipeline di Estrazione Dati (facoltativo)

Se desideri rigenerare o comprendere come sono stati estratti i quiz:
1. Crea un ambiente virtuale ed installa le dipendenze:
   ```bash
   cd extract
   python -m venv venv
   source venv/bin/activate  # Su Windows: venv\Scripts\activate
   pip install pymupdf
   ```
2. Esegui l'estrazione:
   ```bash
   python extract_quizzes.py
   ```
   *Questo script analizzerà i file PDF nella cartella `extract/`, riconoscerà i pattern delle domande ed esporterà le risposte inline o da chiavi finali.*
3. Rimuovi i duplicati e normalizza:
   ```bash
   python remove_duplicates.py
   ```
   *Ridurrà gli oltre 1300 quiz iniziali a 447 quesiti unici ordinati, sovrascrivendo il file `quizzes.json` principale.*

---

## 🤝 Contribuire

Vuoi proporre nuove domande di chimica, correggere refusi o migliorare la simulazione? Ogni contributo è il benvenuto!

1. Esegui il Fork del progetto.
2. Crea un branch per la tua feature (`git checkout -b feature/nuovi-quiz`).
3. Apporta le modifiche (ad esempio modificando/aggiungendo quiz in `quizzes.json` o migliorando la logica in `app.js`).
4. Esegui il commit e fai il push del tuo branch (`git push origin feature/nuovi-quiz`).
5. Apri una **Pull Request** spiegando i cambiamenti apportati.

---

## ✍️ Autore e Licenza

- **Sviluppato da**: [SuperTost100](https://github.com/SuperTost100)
- **Licenza**: [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0) — Sentiti libero di utilizzare, modificare e distribuire questo codice in conformità con i termini della licenza Apache 2.0.
- Il progetto è interamente **Open Source**. Se ti piace, lascia una stella ⭐ su GitHub!
