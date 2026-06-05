/**
 * METODO CONSIGLIATO — Esegui su https://queez.org/app mentre sei loggato.
 *
 * 1. Apri queez.org e accedi
 * 2. DevTools → Console → incolla tutto questo file
 * 3. Al termine scarica queez-chimica-export.json e copialo in data/queez-chimica.json
 */
(async function exportQueezChimicaQuestions() {
  const COURSE_ID = "2";
  const LANG = "it";
  const SALT = "queez_secure_salt_2026_";

  // sha256(SALT + indice) — tabella ufficiale Queez (gr)
  const SHA256_SALT_TO_INDEX = {
    "63adff10ded39e375ef51d61dd6666c4158ce06fe10b112abb822799431c3531": 0,
    b692c0f24183af1b23dbed747baf396f6892c8247227f86563d2f9478dcc0735: 1,
    "1808e9d94a6c02c278748cdb6c6c544484a1b1e01abc94b2f35b5207015231ea": 2,
    "8a68250ee31540dc1daf01d2e6ddead1d3974d7b7844100372bffdf8134efec1": 3,
    "7740abdbb5ae1913c69a4899930da6084d463cc399a4cba6822a512e52fc02e5": 4,
    "03282544f2771e6df96a1e8924962689e58e86d4cbcc33da5924ef3c37040a82": 5,
    "b60278b1741685295a366f5f72534cfe812561ae4d62b7b7c8ed185673858d64": 6,
    "1e3eda85c50f5ceddd97d87681a47640bfa94296a5b0dcefe3b08e83b317d015": 7,
    "e7b810b0512ad6a4e865db2d0d088db1f80bd4644d9b90b233909f1820ef0527": 8,
    "419803046c16fae5a2df4b5b09104b4e2bc95782e863391169bc70f6215d9d0a": 9,
  };

  if (typeof firebase === "undefined" || !firebase.apps?.length) {
    alert("Firebase non caricato. Apri queez.org/app e riprova.");
    return;
  }

  const db = firebase.firestore();
  if (!firebase.auth().currentUser) {
    alert("Devi essere loggato su Queez.");
    return;
  }

  async function sha256Hex(str) {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(str),
    );
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async function importAesKey(keyHex) {
    const raw = new Uint8Array(keyHex.match(/.{2}/g).map((h) => parseInt(h, 16)));
    return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["decrypt"]);
  }

  async function decrypt(aesKey, ivHex, payloadB64) {
    const iv = new Uint8Array(ivHex.match(/.{2}/g).map((h) => parseInt(h, 16)));
    const data = Uint8Array.from(atob(payloadB64), (c) => c.charCodeAt(0));
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, data);
    return JSON.parse(new TextDecoder().decode(plain));
  }

  function flattenChunk(chunk) {
    if (Array.isArray(chunk)) return chunk;
    if (!chunk || typeof chunk !== "object") return [];
    if (Array.isArray(chunk.questions)) return chunk.questions;
    if (Array.isArray(chunk.data)) return chunk.data;
    if (Array.isArray(chunk.items)) return chunk.items;
    return [chunk];
  }

  function answerText(item) {
    if (item == null) return "";
    if (typeof item === "string" || typeof item === "number") return String(item);
    if (typeof item === "object") {
      return String(item.text ?? item.label ?? item.value ?? item.answer ?? "");
    }
    return String(item);
  }

  function normalizeAnswers(raw) {
    const src = raw.answers ?? raw.options ?? raw.choices ?? raw.risposte;
    if (!src) return [];
    if (Array.isArray(src)) {
      return src.map(answerText).filter((t) => t.length > 0);
    }
    if (typeof src === "object") {
      const letters = ["a", "b", "c", "d", "e", "f", "g", "h"];
      return letters
        .filter((l) => src[l] != null && src[l] !== "")
        .map((l) => answerText(src[l]));
    }
    return [];
  }

  /** Stessa logica Queez + fallback su testo risposta */
  async function resolveCorrectIndex(raw, answers) {
    const len = answers.length;
    if (len < 2) return null;

    const hash = raw.right_answer_hash;

    if (hash) {
      if (SHA256_SALT_TO_INDEX[hash] !== undefined) {
        const idx = SHA256_SALT_TO_INDEX[hash];
        if (idx < len) return idx;
      }

      if (typeof md5 === "function") {
        for (let i = 0; i < len; i++) {
          if (md5(SALT + i) === hash) return i;
        }
      }

      for (let i = 0; i < len; i++) {
        if ((await sha256Hex(SALT + i)) === hash) return i;
      }

      if (typeof md5 === "function") {
        for (let i = 0; i < len; i++) {
          if (md5(SALT + answers[i]) === hash) return i;
        }
      }
      for (let i = 0; i < len; i++) {
        if ((await sha256Hex(SALT + answers[i])) === hash) return i;
      }
    }

    let idx = raw.right_answer_index;
    if (idx === undefined) idx = raw.correct;
    if (idx != null && idx >= 0 && idx < len) return idx;

    return null;
  }

  async function toChimiquiz(raw, fallbackId) {
    const answers = normalizeAnswers(raw);
    if (answers.length < 2) return { error: "no_answers" };

    const idx = await resolveCorrectIndex(raw, answers);
    if (idx === null) return { error: "no_index" };

    const letters = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const options = {};
    answers.forEach((ans, i) => {
      if (i < letters.length) options[letters[i]] = ans;
    });

    const question = (raw.question ?? raw.text ?? raw.domanda ?? "").trim();
    if (!question) return { error: "no_question" };

    const queezId = raw.id != null ? String(raw.id) : fallbackId;

    return {
      question,
      options,
      correct_answer: letters[idx],
      original_number: `queez-${queezId}`,
      source: "queez",
      source_file: "firestore",
      verified: !!raw.verified,
      queez_id: queezId,
    };
  }

  console.log("[Queez export] Recupero chiave AES...");
  const keyDoc = await db.collection("app_config").doc("encryption").get();
  if (!keyDoc.exists) throw new Error("Chiave encryption non trovata");
  const aesKey = await importAesKey(keyDoc.data().key);

  console.log("[Queez export] Query domande Chimica...");
  const snap = await db
    .collection("questions")
    .where("courseId", "==", COURSE_ID)
    .where("lang", "==", LANG)
    .orderBy("chunk")
    .get();

  const allRaw = [];
  for (const doc of snap.docs) {
    const { iv, payload } = doc.data();
    const chunk = await decrypt(aesKey, iv, payload);
    allRaw.push(...flattenChunk(chunk));
  }

  console.log(`[Queez export] Domande grezze: ${allRaw.length}`);

  const seen = new Set();
  const out = [];
  const skip = { no_question: 0, no_answers: 0, no_index: 0, duplicate: 0 };
  let sampleFail = null;

  for (let i = 0; i < allRaw.length; i++) {
    const raw = allRaw[i];
    const q = await toChimiquiz(raw, `idx-${i}`);
    if (q.error) {
      skip[q.error]++;
      if (!sampleFail) sampleFail = { error: q.error, raw };
      continue;
    }
    if (seen.has(q.queez_id)) {
      skip.duplicate++;
      continue;
    }
    seen.add(q.queez_id);
    out.push(q);
  }

  if (sampleFail) {
    console.warn("[Queez export] Esempio non convertita:", sampleFail);
    console.warn("Chiavi disponibili:", Object.keys(sampleFail.raw || {}));
  }
  console.log("[Queez export] Saltate:", skip);

  const blob = new Blob([JSON.stringify(out, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "queez-chimica-export.json";
  a.click();
  URL.revokeObjectURL(a.href);

  console.log(`✅ Esportate ${out.length} domande → queez-chimica-export.json`);
  console.log("Copia il file in: data/queez-chimica.json");
  return out;
})().catch((err) => {
  console.error("[Queez export] Errore:", err);
  alert("Export fallito: " + (err.message || err));
});
