import json
import os
import re

def normalize_text(text):
    # Remove all non-alphanumeric characters and lowercase it to ensure robust matching
    return re.sub(r'\W+', '', text).lower()

def main():
    filepath = "../quizzes.json"
    
    with open(filepath, "r", encoding="utf-8") as f:
        quizzes = json.load(f)
        
    seen_questions = set()
    unique_quizzes = []
    
    for q in quizzes:
        question_text = q.get("question", "")
        norm_q = normalize_text(question_text)
        
        # If the question is valid and we haven't seen it yet
        if norm_q and norm_q not in seen_questions:
            seen_questions.add(norm_q)
            unique_quizzes.append(q)
            
    # Renumber the remaining unique quizzes continuously
    for i, q in enumerate(unique_quizzes):
        q["number"] = i + 1
        
    with open(filepath, "w", encoding="utf-8") as out:
        json.dump(unique_quizzes, out, indent=4, ensure_ascii=False)
        
    print(f"Original quizzes: {len(quizzes)}")
    print(f"Unique quizzes after removing duplicates: {len(unique_quizzes)}")

if __name__ == "__main__":
    main()
