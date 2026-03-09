import csv
import json

file_path = '/Volumes/MyData/Workspace/DucTri/DucTriWeb/cunbo_project/data/Math/Stage_4_Unit_1_Lesson_1.3/Math_Stage_4_Unit_1_Lesson_1.3.csv'
out_path = '/Volumes/MyData/Workspace/DucTri/DucTriWeb/cunbo_project/data/Math/Stage_4_Unit_1_Lesson_1.3/Math_Stage_4_Unit_1_Lesson_1.3_formatted.csv'

out_rows = []
with open(file_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for idx, row in enumerate(reader):
        out_row = {
            'order_index': idx + 1,
            'question': row['question'],
            'question_type': row['question_type'],
            'difficulty': 1,
            'points': 10,
            'is_active': 'TRUE',
            'image_url': '',
            'correct_answer': row['correct_answer'],
            'explanation': row['explanation'],
            'hint': row['hint'],
            'option_a': '',
            'option_b': '',
            'option_c': '',
            'option_d': '',
            'correct_option': ''
        }

        # Handle multiple choice
        if row['question_type'] == 'multiple_choice' and row.get('options'):
            try:
                options = json.loads(row['options'])
                labels = ['A', 'B', 'C', 'D']
                for i, opt in enumerate(options):
                    if i < 4:
                        out_row[f'option_{labels[i].lower()}'] = opt
                        if str(opt).strip() == str(row['correct_answer']).strip():
                            out_row['correct_option'] = labels[i]
            except:
                pass

        out_rows.append(out_row)

fieldnames = [
    'order_index', 'question', 'question_type', 'difficulty', 'points', 'is_active', 'image_url',
    'correct_answer', 'explanation', 'hint', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option'
]

with open(file_path, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(out_rows)

print("Reformated CSV to match import-lesson-csv.js requirements.")
