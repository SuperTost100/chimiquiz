import fitz
import re
import json
import os

def parse_quizzes_from_text(text, answers_map=None):
    quizzes = []
    # Match a newline, a number, a dot, and whitespace
    chunks = re.split(r'\n(\d+)\.\s+', '\n' + text)
    
    for i in range(1, len(chunks), 2):
        q_num = int(chunks[i])
        q_body = chunks[i+1]
        
        # Split by options a), b), c) etc. Can have spaces before or after.
        opt_chunks = re.split(r'\n\s*([a-e])\)\s+', q_body)
        if len(opt_chunks) < 3: continue
        
        question_text = opt_chunks[0].strip()
        options = {}
        for j in range(1, len(opt_chunks), 2):
            opt_letter = opt_chunks[j]
            opt_text = opt_chunks[j+1].strip()
            
            # Remove any trailing junk on the last option
            if j == len(opt_chunks) - 2:
                opt_text = re.split(r'\n\n1\s+[a-e]', opt_text)[0]
                opt_text = re.split(r'\n\d+\s+[a-e]\n', opt_text)[0]
                opt_text = re.split(r'\n\[[a-e]\]|\nE[d]\]', opt_text)[0]
                opt_text = opt_text.split('\nnei ')[0]
                opt_text = opt_text.split('\nCH}')[0]
                opt_text = opt_text.split('\nsmMMMHMMAt')[0]
                opt_text = opt_text.split('\n--------------------')[0]
                opt_text = opt_text.split('\n\nSoluzioni')[0]
                
            options[opt_letter] = opt_text.strip()
            
        quizzes.append({
            "number": q_num,
            "question": question_text,
            "options": options,
            "correct_answer": answers_map.get(q_num, "") if answers_map else ""
        })
    return quizzes

def extract_poliquiz(filepath):
    doc = fitz.open(filepath)
    text = "\n".join([page.get_text("text") for page in doc])
    
    answers_map = {}
    for match in re.finditer(r'^(\d+)\s+([a-e])$', text, re.MULTILINE):
        answers_map[int(match.group(1))] = match.group(2)
        
    return parse_quizzes_from_text(text, answers_map)

def extract_quiz_chimica(filepath):
    doc = fitz.open(filepath)
    quizzes = []
    
    for page in doc:
        text = page.get_text("text")
        
        page_quizzes = parse_quizzes_from_text(text)
            
        # Extract answers on this page
        answers = re.findall(r'\[([a-e])\]|E([d])\]', text)
        answers = [a[0] or a[1] for a in answers]
        
        # Match answers to questions on this page
        for i, ans in enumerate(answers):
            if i < len(page_quizzes):
                page_quizzes[i]["correct_answer"] = ans
                
        quizzes.extend(page_quizzes)
        
    return quizzes

def main():
    files = ["Quiz Chimica.pdf", "Quiz Chimica(falli tutti).pdf", "poliquiz - Quiz di Chimica.pdf"]
    all_quizzes = []
    current_number = 1
    
    for f in files:
        filepath = os.path.join(".", f)
        print(f"Processing {f}...")
        if "poliquiz" in f:
            quizzes = extract_poliquiz(filepath)
        else:
            quizzes = extract_quiz_chimica(filepath)
            
        print(f"  Extracted {len(quizzes)} quizzes.")
        
        for q in quizzes:
            # We only keep valid questions
            if not q["question"]: continue
            q["original_number"] = q["number"]
            q["number"] = current_number
            q["source_file"] = f
            all_quizzes.append(q)
            current_number += 1
            
    out_path = "../quizzes.json"
    with open(out_path, "w", encoding="utf-8") as out:
        json.dump(all_quizzes, out, indent=4, ensure_ascii=False)
    print(f"Total quizzes saved: {len(all_quizzes)} to {out_path}")

if __name__ == "__main__":
    main()
