#!/usr/bin/env python3
"""
Scarica tutte le domande di Chimica (courseId=2) da Firestore Queez, le decrittografa
e salva data/queez-chimica.json nel formato Chimiquiz.

Autenticazione: serve un refresh token Firebase valido (NON la API key da sola).
La API key è pubblica ma accetta richieste solo con Referer https://queez.org/

Come ottenere il refresh token (mentre sei loggato su https://queez.org):
  1. Apri DevTools → Console
  2. Incolla lo snippet in scripts/export_queez_token.js e copia il token
  3. Esporta: export QUEEZ_REFRESH_TOKEN='...'

Oppure usa direttamente lo script browser (più semplice):
  scripts/export_queez_chimica_browser.js

Uso:
  pip install requests cryptography
  export QUEEZ_REFRESH_TOKEN='...'
  python3 scripts/fetch_queez_chimica_firestore.py

  # oppure
  python3 scripts/fetch_queez_chimica_firestore.py --credentials scripts/queez.credentials.json
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import sys
from pathlib import Path

try:
    import requests
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
except ImportError:
    print("Dipendenze mancanti. Esegui: pip install requests cryptography", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "queez-chimica.json"

# Config Firebase Queez (pubblica nel bundle client)
API_KEY = os.environ.get("QUEEZ_FIREBASE_API_KEY", "AIzaSyDvUQvnKoDXCQzrRpXAD_vQZO3HLUIlGDc")
PROJECT_ID = "queez--app"
REFERER = "https://queez.org/"
COURSE_ID = "2"
LANG = "it"

SALT = "queez_secure_salt_2026_"

# sha256(SALT + indice) — tabella Queez (gr)
SHA256_SALT_TO_INDEX = {
    "63adff10ded39e375ef51d61dd6666c4158ce06fe10b112abb822799431c3531": 0,
    "b692c0f24183af1b23dbed747baf396f6892c8247227f86563d2f9478dcc0735": 1,
    "1808e9d94a6c02c278748cdb6c6c544484a1b1e01abc94b2f35b5207015231ea": 2,
    "8a68250ee31540dc1daf01d2e6ddead1d3974d7b7844100372bffdf8134efec1": 3,
    "7740abdbb5ae1913c69a4899930da6084d463cc399a4cba6822a512e52fc02e5": 4,
    "03282544f2771e6df96a1e8924962689e58e86d4cbcc33da5924ef3c37040a82": 5,
    "b60278b1741685295a366f5f72534cfe812561ae4d62b7b7c8ed185673858d64": 6,
    "1e3eda85c50f5ceddd97d87681a47640bfa94296a5b0dcefe3b08e83b317d015": 7,
    "e7b810b0512ad6a4e865db2d0d088db1f80bd4644d9b90b233909f1820ef0527": 8,
    "419803046c16fae5a2df4b5b09104b4e2bc95782e863391169bc70f6215d9d0a": 9,
}

TOKEN_URL = f"https://securetoken.googleapis.com/v1/token?key={API_KEY}"
FIRESTORE_BASE = (
    f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"
)


def load_credentials(path: Path | None) -> dict:
    creds = {
        "api_key": API_KEY,
        "refresh_token": os.environ.get("QUEEZ_REFRESH_TOKEN", ""),
        "id_token": os.environ.get("QUEEZ_ID_TOKEN", ""),
    }
    if path and path.exists():
        data = json.loads(path.read_text(encoding="utf-8"))
        creds.update({k: v for k, v in data.items() if v})
    return creds


def get_id_token(creds: dict) -> str:
    if creds.get("id_token"):
        return creds["id_token"]

    refresh = creds.get("refresh_token", "").strip()
    if not refresh:
        raise SystemExit(
            "Manca QUEEZ_REFRESH_TOKEN.\n"
            "Estrailo da queez.org con: scripts/export_queez_token.js (console browser)"
        )

    resp = requests.post(
        TOKEN_URL,
        headers={"Referer": REFERER},
        data={"grant_type": "refresh_token", "refresh_token": refresh},
        timeout=30,
    )
    if not resp.ok:
        err = resp.json().get("error", {})
        msg = err.get("message", resp.text)
        raise SystemExit(f"Token Firebase non valido: {msg}\n(Rigenera il refresh token da queez.org)")

    return resp.json()["id_token"]


def firestore_headers(id_token: str) -> dict:
    return {
        "Authorization": f"Bearer {id_token}",
        "Referer": REFERER,
    }


def get_document(id_token: str, collection: str, doc_id: str) -> dict:
    url = f"{FIRESTORE_BASE}/{collection}/{doc_id}"
    resp = requests.get(url, headers=firestore_headers(id_token), timeout=60)
    resp.raise_for_status()
    return resp.json()


def run_query(id_token: str, structured_query: dict) -> list[dict]:
    url = f"{FIRESTORE_BASE}:runQuery"
    resp = requests.post(
        url,
        headers={**firestore_headers(id_token), "Content-Type": "application/json"},
        json={"structuredQuery": structured_query},
        timeout=120,
    )
    resp.raise_for_status()
    rows = resp.json()
    docs = []
    for row in rows:
        if "document" in row:
            docs.append(row["document"])
    return docs


def firestore_value(field: dict):
    if "stringValue" in field:
        return field["stringValue"]
    if "integerValue" in field:
        return int(field["integerValue"])
    if "booleanValue" in field:
        return field["booleanValue"]
    if "arrayValue" in field:
        vals = field["arrayValue"].get("values", [])
        return [firestore_value(v) for v in vals]
    if "mapValue" in field:
        return {
            k: firestore_value(v)
            for k, v in field["mapValue"].get("fields", {}).items()
        }
    return None


def doc_fields(document: dict) -> dict:
    return {
        k: firestore_value(v)
        for k, v in document.get("fields", {}).items()
    }


def import_aes_key(key_hex: str) -> bytes:
    return bytes.fromhex(key_hex)


def decrypt_payload(aes_key: bytes, iv_hex: str, payload_b64: str):
    iv = bytes.fromhex(iv_hex)
    ciphertext = base64.b64decode(payload_b64)
    aesgcm = AESGCM(aes_key)
    plaintext = aesgcm.decrypt(iv, ciphertext, None)
    return json.loads(plaintext.decode("utf-8"))


def answer_text(item) -> str:
    if item is None:
        return ""
    if isinstance(item, (str, int, float)):
        return str(item)
    if isinstance(item, dict):
        return str(item.get("text") or item.get("label") or item.get("value") or item.get("answer") or "")
    return str(item)


def normalize_answers(raw: dict) -> list[str]:
    src = raw.get("answers")
    if src is None:
        src = raw.get("options") or raw.get("choices") or raw.get("risposte")
    if not src:
        return []
    if isinstance(src, list):
        return [t for t in (answer_text(a) for a in src) if t]
    if isinstance(src, dict):
        letters = ["a", "b", "c", "d", "e", "f", "g", "h"]
        out = []
        for letter in letters:
            text = answer_text(src.get(letter))
            if text:
                out.append(text)
        return out
    return []


def flatten_chunk(chunk) -> list:
    if isinstance(chunk, list):
        return chunk
    if isinstance(chunk, dict):
        for key in ("questions", "data", "items"):
            if isinstance(chunk.get(key), list):
                return chunk[key]
        return [chunk]
    return []


def resolve_correct_index(raw: dict, answers: list[str]) -> int | None:
    answers_len = len(answers)
    if answers_len < 2:
        return None

    idx = None
    answer_hash = raw.get("right_answer_hash")

    if answer_hash:
        if answer_hash in SHA256_SALT_TO_INDEX:
            candidate = SHA256_SALT_TO_INDEX[answer_hash]
            if candidate < answers_len:
                idx = candidate

        if idx is None:
            for i in range(answers_len):
                if hashlib.md5(f"{SALT}{i}".encode()).hexdigest() == answer_hash:
                    idx = i
                    break

        if idx is None:
            for i in range(answers_len):
                if hashlib.sha256(f"{SALT}{i}".encode()).hexdigest() == answer_hash:
                    idx = i
                    break

        if idx is None:
            for i, text in enumerate(answers):
                if hashlib.md5(f"{SALT}{text}".encode()).hexdigest() == answer_hash:
                    idx = i
                    break

        if idx is None:
            for i, text in enumerate(answers):
                if hashlib.sha256(f"{SALT}{text}".encode()).hexdigest() == answer_hash:
                    idx = i
                    break

    if idx is None:
        candidate = raw.get("right_answer_index")
        if candidate is None:
            candidate = raw.get("correct")
        if candidate is not None and candidate >= 0:
            idx = candidate

    if idx is None or idx < 0 or idx >= answers_len:
        return None
    return idx


def to_chimiquiz_question(raw: dict, fallback_id: str) -> dict | None:
    answers = normalize_answers(raw)
    if len(answers) < 2:
        return None

    idx = resolve_correct_index(raw, answers)
    if idx is None:
        return None

    letters = ["a", "b", "c", "d", "e", "f", "g", "h"]
    options = {}
    for i, ans in enumerate(answers):
        if i < len(letters):
            options[letters[i]] = ans

    question = (raw.get("question") or raw.get("text") or raw.get("domanda") or "").strip()
    if not question:
        return None

    qid = raw.get("id")
    qid = str(qid) if qid is not None else fallback_id
    return {
        "question": question,
        "options": options,
        "correct_answer": letters[idx],
        "original_number": f"queez-{qid}",
        "source": "queez",
        "source_file": "firestore",
        "verified": bool(raw.get("verified", False)),
        "queez_id": qid,
    }


def fetch_all_questions(id_token: str) -> list[dict]:
    enc_doc = get_document(id_token, "app_config", "encryption")
    key_hex = doc_fields(enc_doc).get("key")
    if not key_hex:
        raise SystemExit("Documento app_config/encryption senza campo 'key'")

    aes_key = import_aes_key(key_hex)

    query = {
        "from": [{"collectionId": "questions"}],
        "where": {
            "compositeFilter": {
                "op": "AND",
                "filters": [
                    {
                        "fieldFilter": {
                            "field": {"fieldPath": "courseId"},
                            "op": "EQUAL",
                            "value": {"stringValue": COURSE_ID},
                        }
                    },
                    {
                        "fieldFilter": {
                            "field": {"fieldPath": "lang"},
                            "op": "EQUAL",
                            "value": {"stringValue": LANG},
                        }
                    },
                ],
            }
        },
        "orderBy": [{"field": {"fieldPath": "chunk"}, "direction": "ASCENDING"}],
    }

    chunk_docs = run_query(id_token, query)
    print(f"Trovati {len(chunk_docs)} chunk Firestore per Chimica ({LANG})")

    all_raw = []
    for doc in chunk_docs:
        fields = doc_fields(doc)
        iv = fields.get("iv")
        payload = fields.get("payload")
        if not iv or not payload:
            continue
        chunk_questions = decrypt_payload(aes_key, iv, payload)
        all_raw.extend(flatten_chunk(chunk_questions))

    print(f"Domande decrittografate: {len(all_raw)}")

    out = []
    skipped = 0
    for i, raw in enumerate(all_raw):
        mapped = to_chimiquiz_question(raw, f"idx-{i}")
        if mapped:
            out.append(mapped)
        else:
            skipped += 1

    if skipped:
        print(f"Saltate (dati incompleti / hash non risolto): {skipped}")

    # dedupe by queez id
    seen = set()
    unique = []
    for q in out:
        if q["queez_id"] in seen:
            continue
        seen.add(q["queez_id"])
        unique.append(q)

    return unique


def main() -> None:
    parser = argparse.ArgumentParser(description="Scarica domande Chimica da Firestore Queez")
    parser.add_argument(
        "--credentials",
        type=Path,
        default=ROOT / "scripts" / "queez.credentials.json",
        help="JSON con refresh_token (opzionale se usi env)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=OUT,
        help="File JSON di output",
    )
    args = parser.parse_args()

    creds = load_credentials(args.credentials if args.credentials.exists() else None)
    id_token = get_id_token(creds)
    questions = fetch_all_questions(id_token)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(questions, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Scritte {len(questions)} domande in {args.output}")


if __name__ == "__main__":
    main()
