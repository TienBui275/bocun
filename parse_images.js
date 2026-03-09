const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const folderPath = path.resolve(__dirname, 'data/Math_Stage_4_Unit_1_Lesson_1.3');
const xlsxPath = path.join(folderPath, 'Math_Stage_4_Unit_1_Lesson_1.3.xlsx');

const TEMPLATE_COLUMNS = [
  'order_index','question','question_type','difficulty','points','is_active',
  'source_image','crop_x','crop_y','crop_w','crop_h','image_url',
  'correct_answer','explanation','hint','option_a','option_b','option_c','option_d','correct_option'
];

// Based on the images you provided for Stage 4 Unit 1 Lesson 1.3 Place Value:
const rows = [
  {
    order_index: 1,
    question: 'Write the number represented by the base ten blocks.',
    question_type: 'fill_blank',
    difficulty: 1,
    points: 10,
    is_active: 'TRUE',
    source_image: '1.png',
    image_url: 'images/math_s4_u1_l1.3_q1.png',
    correct_answer: '1243'
  },
  {
    order_index: 2,
    question: 'What is the value of the underlined digit? 45,678 (underline under 6)',
    question_type: 'fill_blank',
    difficulty: 1,
    points: 10,
    is_active: 'TRUE',
    source_image: '2.png',
    image_url: 'images/math_s4_u1_l1.3_q2.png',
    correct_answer: '600'
  },
  {
    order_index: 3,
    question: 'Write the number in words: 34,500',
    question_type: 'fill_blank',
    difficulty: 2,
    points: 10,
    is_active: 'TRUE',
    source_image: '3.png',
    image_url: 'images/math_s4_u1_l1.3_q3.png',
    correct_answer: 'thirty-four thousand, five hundred'
  },
  {
    order_index: 4,
    question: 'Write the number in figures: twenty-one thousand and forty',
    question_type: 'fill_blank',
    difficulty: 2,
    points: 10,
    is_active: 'TRUE',
    source_image: '4.png',
    image_url: 'images/math_s4_u1_l1.3_q4.png',
    correct_answer: '21040'
  },
  {
    order_index: 5,
    question: 'Complete the expanded form: 56,789 = 50,000 + ____ + 700 + 80 + 9',
    question_type: 'fill_blank',
    difficulty: 1,
    points: 10,
    is_active: 'TRUE',
    source_image: '5.png',
    image_url: 'images/math_s4_u1_l1.3_q5.png',
    correct_answer: '6000'
  },
  {
    order_index: 6,
    question: 'What is 1000 more than 45,210?',
    question_type: 'fill_blank',
    difficulty: 2,
    points: 10,
    is_active: 'TRUE',
    source_image: '6.png',
    image_url: 'images/math_s4_u1_l1.3_q6.png',
    correct_answer: '46210'
  }
];

// Clean up rows to ensure all fields exist
const finalRows = rows.map(r => {
  const result = {};
  TEMPLATE_COLUMNS.forEach(col => {
    result[col] = r[col] || '';
  });
  return result;
});

const ws = XLSX.utils.json_to_sheet(finalRows, { header: TEMPLATE_COLUMNS });
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Exercises');
XLSX.writeFile(wb, xlsxPath);

console.log('✅ File Excel đã được tạo thành công dựa trên nội dung các ảnh: ' + xlsxPath);
