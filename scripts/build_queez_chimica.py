#!/usr/bin/env python3
"""Build data/queez-chimica.json from extract.null/quiz_chimica.txt (Queez-style PDF extract)."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "extract.null" / "quiz_chimica.txt"
OUT = ROOT / "data" / "queez-chimica.json"


def parse_quizzes_from_text(text: str) -> list[dict]:
    chunks = re.split(r"\n(\d+)\.\s+", "\n" + text)
    quizzes = []

    for i in range(1, len(chunks), 2):
        q_num = int(chunks[i])
        q_body = chunks[i + 1]
        opt_chunks = re.split(r"\n\s*([a-e])\)\s*\n", q_body)
        if len(opt_chunks) < 3:
            continue

        question_text = opt_chunks[0].strip()
        options = {}
        for j in range(1, len(opt_chunks), 2):
            letter = opt_chunks[j]
            opt_text = opt_chunks[j + 1].strip()
            if j == len(opt_chunks) - 2:
                opt_text = re.split(r"\n\[[a-e]\]|\nE[d]\]|\n-{3,}", opt_text)[0]
                opt_text = opt_text.split("\nnei ")[0]
            options[letter] = opt_text.strip()

        if not question_text or len(options) < 2:
            continue

        quizzes.append(
            {
                "number": q_num,
                "question": question_text,
                "options": options,
                "correct_answer": "",
            }
        )

    return quizzes


def attach_answers(quizzes: list[dict], text: str) -> None:
    """Match [a]-[e] answer blocks to questions in document order."""
    answers = re.findall(r"\[([a-e])\]|E([d])\]", text)
    answers = [a[0] or a[1] for a in answers]
    for i, ans in enumerate(answers):
        if i < len(quizzes) and ans in quizzes[i]["options"]:
            quizzes[i]["correct_answer"] = ans


def main() -> None:
    text = SRC.read_text(encoding="utf-8")
    quizzes = parse_quizzes_from_text(text)
    attach_answers(quizzes, text)

    out = []
    for q in quizzes:
        if not q["correct_answer"]:
            continue
        out.append(
            {
                "question": q["question"],
                "options": q["options"],
                "correct_answer": q["correct_answer"],
                "original_number": f"queez-{q['number']}",
                "source": "queez",
                "source_file": "quiz_chimica.txt",
            }
        )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(out)} questions to {OUT}")


if __name__ == "__main__":
    main()
