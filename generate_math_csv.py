import csv
import os
import json

data = [
    {
        "question": "Look at the number 829. What digit is in the tens place?\n\n| 100s | 10s | 1s |\n|---|---|---|\n| 8 | 2 | 9 |",
        "question_type": "fill_blank",
        "options": "",
        "explanation": "The Place Value Table shows the 10s column has a 2.",
        "hint": "Look at the second column from the right.",
        "correct_answer": "2"
    },
    {
        "question": "Look at the number 829. What is the value of the 8 in this number?\n\n| 100s | 10s | 1s |\n|---|---|---|\n| 8 | 2 | 9 |",
        "question_type": "fill_blank",
        "options": "",
        "explanation": "The 8 is in the 100s column, meaning it represents eight hundreds (800).",
        "hint": "Check the column header where the digit 8 is placed.",
        "correct_answer": "800"
    },
    {
        "question": "What is the value of the digit 9 in 950 302?",
        "question_type": "multiple_choice",
        "options": json.dumps(["9", "90 000", "900 000", "9 000 000"]),
        "explanation": "9 is in the hundred thousands place, so its value is 900 000.",
        "hint": "Count the places from right to left: ones, tens, hundreds, thousands, ten thousands, hundred thousands.",
        "correct_answer": "900 000"
    },
    {
        "question": "What is the value of the digit 5 in 950 302?",
        "question_type": "fill_blank",
        "options": "",
        "explanation": "5 is in the ten thousands place, so its value is 50 000.",
        "hint": "Look at the 5th digit from the right.",
        "correct_answer": "50 000"
    },
    {
        "question": "Mia is thinking of a 5-digit whole number. She says:\n- It has a 2 in the ten thousands place and in the tens place.\n- It has a 5 in the thousands place and in the ones place.\n- It has a 0 in the hundreds place.\nWhat number is Mia thinking of?",
        "question_type": "fill_blank",
        "options": "",
        "explanation": "The ten thousands place is 2. The thousands place is 5. The hundreds place is 0. The tens place is 2. The ones place is 5. Putting it together: 25025.",
        "hint": "Write down five blanks: _ _ , _ _ _ and fill them one by one according to Mia's rules.",
        "correct_answer": "25025"
    },
    {
        "question": "Decompose the number by copying and filling in the missing numbers:\n805 469 = ___ + 5000 + ___ + ___ + 9",
        "question_type": "fill_blank",
        "options": "",
        "explanation": "805 469 has 8 hundred thousands, 0 ten thousands, 5 thousands, 4 hundreds, 6 tens, and 9 ones. So it is 800000 + 5000 + 400 + 60 + 9.",
        "hint": "Expand the number according to the place value of each digit. Ignore zeroes.",
        "correct_answer": "800000, 400, 60"
    },
    {
        "question": "Decompose the number by copying and filling in the missing numbers:\n689 567 = 600000 + ___ + ___ + 500 + ___ + ___",
        "question_type": "fill_blank",
        "options": "",
        "explanation": "689 567 expands to 600 000 + 80 000 + 9000 + 500 + 60 + 7.",
        "hint": "Expand based on position value. What does the 8 represent? What about 9, 6 and 7?",
        "correct_answer": "80000, 9000, 60, 7"
    },
    {
        "question": "Decompose the number by copying and filling in the missing numbers:\n508 208 = ___ + ___ + ___ + ___",
        "question_type": "fill_blank",
        "options": "",
        "explanation": "508 208 = 500 000 + 8000 + 200 + 8. (Since 0 ten thousands and 0 tens are skipped).",
        "hint": "Write each non-zero digit with the appropriate number of zeros behind it.",
        "correct_answer": "500000, 8000, 200, 8"
    },
    {
        "question": "Bruno says, 'The largest 5-digit number is 1 less than a hundred thousand.' Is Bruno correct?",
        "question_type": "multiple_choice",
        "options": json.dumps(["Yes", "No"]),
        "explanation": "A hundred thousand is 100 000 (a 6-digit number). One less is 99 999, which is indeed the largest 5-digit number. So Bruno is correct.",
        "hint": "Write down the number for a hundred thousand, then subtract 1 from it. What do you get?",
        "correct_answer": "Yes"
    },
    {
        "question": "Which number sentence has a different missing number?\n\n1. ___ x 100 = 30 000\n2. 3 x 100 = ___\n3. 30 000 ÷ 100 = ___\n4. ___ ÷ 10 = 30\n5. ___ x 100 = 3000\n6. ___ x 10 = 3000",
        "question_type": "multiple_choice",
        "options": json.dumps(["___ x 100 = 30 000", "3 x 100 = ___", "30 000 ÷ 100 = ___", "___ ÷ 10 = 30", "___ x 100 = 3000", "___ x 10 = 3000"]),
        "explanation": "The missing numbers are:\n1. 300\n2. 300\n3. 300\n4. 300\n5. 30  <- This is the different one.\n6. 300\nThe different missing number is 30, for the sentence ___ x 100 = 3000.",
        "hint": "Solve each equation to find the missing number. Only one of them will give a result other than 300.",
        "correct_answer": "___ x 100 = 3000"
    }
]

file_path = '/Volumes/MyData/Workspace/DucTri/DucTriWeb/cunbo_project/data/Math/Stage_4_Unit_1_Lesson_1.3/Math_Stage_4_Unit_1_Lesson_1.3.csv'
os.makedirs(os.path.dirname(file_path), exist_ok=True)

with open(file_path, mode='w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=["question", "question_type", "options", "explanation", "hint", "correct_answer"])
    writer.writeheader()
    for row in data:
        writer.writerow(row)

print("CSV file created successfully at " + file_path)
