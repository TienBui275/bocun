import csv
import json

file_path = '/Volumes/MyData/Workspace/DucTri/DucTriWeb/cunbo_project/data/Math/Stage_4_Unit_1_Lesson_1.3/Math_Stage_4_Unit_1_Lesson_1.3.csv'

out_rows = []
with open(file_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for idx, row in enumerate(reader):
        out_row = {
            'order_index': idx + 1,
            'question': row['question'].replace('\n', ' \\n '),
            'question_type': row['question_type'],
            'difficulty': 1,
            'points': 10,
            'is_active': 'TRUE',
            'image_url': '',
            'correct_answer': row['correct_answer'].replace('\n', ' \\n '),
            'explanation': row['explanation'].replace('\n', ' \\n '),
            'hint': row['hint'].replace('\n', ' \\n '),
            'option_a': '',
            'option_b': '',
            'option_c': '',
            'option_d': '',
            'correct_option': ''
        }

        # Handle multiple choice
        if row['question_type'] == 'multiple_choice' and row.get('option_a') is None:
            # Reconstruct from old format if possible
            if out_row['order_index'] == 10:
                # Manually define options to guarantee the correct one is present within the 4 slots
                out_row['option_a'] = "___ x 100 = 30 000"
                out_row['option_b'] = "3 x 100 = ___"
                out_row['option_c'] = "30 000 ÷ 100 = ___"
                out_row['option_d'] = "___ x 100 = 3000"
                out_row['correct_option'] = "D"
        else:
            if row.get('option_a'): out_row['option_a'] = row['option_a'].replace('\n', ' \\n ')
            if row.get('option_b'): out_row['option_b'] = row['option_b'].replace('\n', ' \\n ')
            if row.get('option_c'): out_row['option_c'] = row['option_c'].replace('\n', ' \\n ')
            if row.get('option_d'): out_row['option_d'] = row['option_d'].replace('\n', ' \\n ')
            if row.get('correct_option'): out_row['correct_option'] = row['correct_option'].replace('\n', ' \\n ')

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
