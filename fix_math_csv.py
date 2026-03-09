import csv
import json

file_path = '/Volumes/MyData/Workspace/DucTri/DucTriWeb/cunbo_project/data/Math/Stage_4_Unit_1_Lesson_1.3/Math_Stage_4_Unit_1_Lesson_1.3.csv'

rows = []
with open(file_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        # Question 3: "What is the value of the digit 9 in 950 302?" -> fill_blank, no options
        if "value of the digit 9 in 950 302" in row['question']:
            row['question_type'] = 'fill_blank'
            row['options'] = ""
            
        # Question 9: "Bruno says..." -> fill_blank, no options
        if "Bruno says" in row['question']:
            row['question_type'] = 'fill_blank'
            row['options'] = ""
            row['correct_answer'] = "Yes"

        rows.append(row)

with open(file_path, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=["question", "question_type", "options", "explanation", "hint", "correct_answer"])
    writer.writeheader()
    writer.writerows(rows)

print("CSV file updated successfully.")
