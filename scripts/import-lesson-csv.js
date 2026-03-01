const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { uploadExerciseImages } = require('./upload-exercise-images')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function usage() {
  console.log(`
Usage:
  node scripts/import-lesson-csv.js --file <csv-path> [options]

Required:
  --file <path>               CSV file path

Optional (auto-detect from filename if possible):
  --stage <number>            Stage number (e.g. 4)
  --subject <subject>         Subject slug or name (e.g. math, toan, Math)
  --unit <number>             Unit number (e.g. 1)
  --lesson <number>           Lesson number (e.g. 1.1)
  --skip-image-sync           Skip uploading images + converting image_url to public URL
  --dry-run                   Parse and validate only, no DB write

CSV column format:
  fill_blank  : order_index, question, question_type, difficulty, points, is_active, image_url, correct_answer, explanation, hint
  true_false  : same as fill_blank (correct_answer = "true" or "false")
  multiple_choice: same columns PLUS option_a, option_b, option_c, option_d, correct_option (e.g. "B")
                   option_c and option_d are optional

Filename auto-detect pattern:
  <Subject>_Stage_<N>_Unit_<N>_Lesson_<N.N>.csv
Example:
  Math_Stage_4_Unit_1_Lesson_1.1.csv
`)
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    skipImageSync: false,
  }

  for (let index = 0; index < argv.length; index++) {
    const token = argv[index]

    if (!token.startsWith('--')) continue

    const key = token.slice(2)

    if (key === 'dry-run') {
      args.dryRun = true
      continue
    }

    if (key === 'skip-image-sync') {
      args.skipImageSync = true
      continue
    }

    const value = argv[index + 1]
    if (!value || value.startsWith('--')) {
      throw new Error(`Thiếu giá trị cho --${key}`)
    }

    args[key] = value
    index += 1
  }

  return args
}

function parseBool(value) {
  if (value === null || value === undefined) return false
  const normalized = String(value).trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes'
}

function splitCsvLine(line) {
  return line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
}

function unquote(value) {
  if (value === undefined || value === null) return null
  const trimmed = String(value).trim()

  if (trimmed.length === 0) {
    return null
  }

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/""/g, '"')
  }

  return trimmed
}

function parseCsv(csvContent) {
  const lines = csvContent
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)

  if (lines.length < 2) {
    return []
  }

  const headers = splitCsvLine(lines[0]).map(unquote)

  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line)
    const row = {}

    headers.forEach((header, index) => {
      row[header] = unquote(cols[index])
    })

    return {
      order_index: Number(row.order_index),
      question: row.question,
      question_type: row.question_type || 'fill_blank',
      difficulty: row.difficulty ? Number(row.difficulty) : 1,
      points: row.points ? Number(row.points) : 10,
      is_active: parseBool(row.is_active),
      image_url: row.image_url || null,
      correct_answer: row.correct_answer || null,
      explanation: row.explanation || null,
      hint: row.hint || null,
      // multiple_choice options (optional columns)
      option_a: row.option_a || null,
      option_b: row.option_b || null,
      option_c: row.option_c || null,
      option_d: row.option_d || null,
      correct_option: row.correct_option ? String(row.correct_option).trim().toUpperCase() : null,
    }
  })
}

function inferFromFilename(filePath) {
  const fileName = path.basename(filePath)
  const match = fileName.match(/^(.+?)_Stage_(\d+)_Unit_(\d+)_Lesson_([\d.]+)\.csv$/i)

  if (!match) {
    return {}
  }

  return {
    subject: match[1],
    stage: match[2],
    unit: match[3],
    lesson: match[4],
  }
}

async function resolveGradeId(stageValue) {
  const stageNumber = Number(stageValue)
  if (!Number.isFinite(stageNumber)) {
    throw new Error(`Stage không hợp lệ: ${stageValue}`)
  }

  const slugCandidates = [`stage-${stageNumber}`, `lop-${stageNumber}`]
  const nameCandidates = [`stage ${stageNumber}`, `lớp ${stageNumber}`]

  const { data, error } = await supabase
    .from('grades')
    .select('id, slug, name')

  if (error) {
    throw new Error(`Không lấy được grades: ${error.message}`)
  }

  const grade =
    data.find((row) => slugCandidates.includes(String(row.slug).toLowerCase())) ||
    data.find((row) => nameCandidates.includes(String(row.name).toLowerCase()))

  if (!grade) {
    throw new Error(`Không tìm thấy grade cho Stage ${stageNumber}`)
  }

  return grade
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
}

async function resolveSubjectId(subjectValue) {
  const subjectInput = String(subjectValue || '').trim()
  if (!subjectInput) {
    throw new Error('Subject trống')
  }

  const normalizedInput = normalizeText(subjectInput)

  const { data, error } = await supabase
    .from('subjects')
    .select('id, slug, name')

  if (error) {
    throw new Error(`Không lấy được subjects: ${error.message}`)
  }

  const subject = data.find((row) => {
    const slug = normalizeText(row.slug)
    const name = normalizeText(row.name)
    return slug === normalizedInput || name === normalizedInput
  })

  if (!subject) {
    throw new Error(`Không tìm thấy subject: ${subjectInput}`)
  }

  return subject
}

async function resolveUnitAndLesson(gradeId, subjectId, unitNumber, lessonNumber) {
  const unitNo = Number(unitNumber)
  if (!Number.isFinite(unitNo)) {
    throw new Error(`Unit number không hợp lệ: ${unitNumber}`)
  }

  const { data: unit, error: unitError } = await supabase
    .from('units')
    .select('id, title, unit_number')
    .eq('grade_id', gradeId)
    .eq('subject_id', subjectId)
    .eq('unit_number', unitNo)
    .single()

  if (unitError || !unit) {
    throw new Error(`Không tìm thấy Unit ${unitNo} cho grade_id=${gradeId}, subject_id=${subjectId}`)
  }

  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id, title, lesson_number')
    .eq('unit_id', unit.id)
    .eq('lesson_number', String(lessonNumber))
    .single()

  if (lessonError || !lesson) {
    throw new Error(`Không tìm thấy Lesson ${lessonNumber} trong Unit ${unitNo}`)
  }

  return { unit, lesson }
}

async function recomputeCounters(gradeId, subjectId, lessonId) {
  const { count: lessonCount, error: lessonCountError } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .eq('lesson_id', lessonId)

  if (!lessonCountError) {
    await supabase
      .from('lessons')
      .update({ exercise_count: lessonCount || 0 })
      .eq('id', lessonId)
  }

  const { data: unitRows, error: unitError } = await supabase
    .from('units')
    .select('id')
    .eq('grade_id', gradeId)
    .eq('subject_id', subjectId)

  if (unitError || !unitRows || unitRows.length === 0) {
    return lessonCount || 0
  }

  const unitIds = unitRows.map((row) => row.id)

  const { data: lessonRows, error: lessonsError } = await supabase
    .from('lessons')
    .select('id')
    .in('unit_id', unitIds)

  if (lessonsError || !lessonRows || lessonRows.length === 0) {
    return lessonCount || 0
  }

  const lessonIds = lessonRows.map((row) => row.id)

  const { count: totalExercises, error: totalError } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .in('lesson_id', lessonIds)

  if (!totalError) {
    const { data: gsRow } = await supabase
      .from('grade_subjects')
      .select('id')
      .eq('grade_id', gradeId)
      .eq('subject_id', subjectId)
      .maybeSingle()

    if (gsRow?.id) {
      await supabase
        .from('grade_subjects')
        .update({ exercise_count: totalExercises || 0 })
        .eq('id', gsRow.id)
    }
  }

  return lessonCount || 0
}

function validateRows(rows) {
  if (!rows.length) {
    throw new Error('CSV không có dòng dữ liệu')
  }

  for (const row of rows) {
    if (!Number.isFinite(row.order_index)) {
      throw new Error('Có dòng thiếu order_index hoặc order_index không phải số')
    }

    if (!row.question) {
      throw new Error(`Q${row.order_index}: thiếu question`)
    }

    if (!row.question_type) {
      throw new Error(`Q${row.order_index}: thiếu question_type`)
    }

    if (row.question_type === 'multiple_choice') {
      if (!row.option_a || !row.option_b) {
        console.warn(`⚠️  Q${row.order_index}: multiple_choice nhưng thiếu option_a/option_b — options sẽ không được import`)
      }
      if (!row.correct_option) {
        console.warn(`⚠️  Q${row.order_index}: multiple_choice nhưng thiếu correct_option — không biết đáp án đúng`)
      }
    }
  }
}

/**
 * For multiple_choice exercises: delete existing options and re-create from
 * option_a/b/c/d + correct_option columns.
 */
async function upsertMultipleChoiceOptions(exerciseId, row) {
  const optionDefs = [
    { label: 'A', text: row.option_a },
    { label: 'B', text: row.option_b },
    { label: 'C', text: row.option_c },
    { label: 'D', text: row.option_d },
  ].filter((o) => o.text)

  if (optionDefs.length === 0) {
    console.log(`   ⚠️  Q${row.order_index}: multiple_choice nhưng không có option_a/b/c/d trong CSV — bỏ qua`)
    return
  }

  const correct = String(row.correct_option ?? '').trim().toUpperCase()

  // Delete old options first (idempotent re-import)
  await supabase.from('exercise_options').delete().eq('exercise_id', exerciseId)

  const { error } = await supabase.from('exercise_options').insert(
    optionDefs.map((o, i) => ({
      exercise_id:  exerciseId,
      option_label: o.label,
      option_text:  o.text,
      is_correct:   o.label === correct,
      order_index:  i + 1,
    }))
  )

  if (error) {
    console.log(`   ⚠️  exercise_options insert fail for exercise ${exerciseId}: ${error.message}`)
  }
}

/**
 * For true_false exercises: delete existing options and re-create the two
 * canonical True/False rows, marking the correct one via `correct_answer`.
 */
async function upsertTrueFalseOptions(exerciseId, correctAnswer) {
  // Delete old options first (idempotent re-import)
  await supabase.from('exercise_options').delete().eq('exercise_id', exerciseId)

  const ca = String(correctAnswer ?? '').trim().toLowerCase()
  const trueIsCorrect = ca === 'true' || ca === '1' || ca === 'yes' || ca === 'đúng'

  const { error } = await supabase.from('exercise_options').insert([
    {
      exercise_id:  exerciseId,
      option_label: 'A',
      option_text:  'Đúng (True)',
      is_correct:   trueIsCorrect,
      order_index:  1,
    },
    {
      exercise_id:  exerciseId,
      option_label: 'B',
      option_text:  'Sai (False)',
      is_correct:   !trueIsCorrect,
      order_index:  2,
    },
  ])

  if (error) {
    console.log(`   ⚠️  exercise_options insert fail for exercise ${exerciseId}: ${error.message}`)
  }
}

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local')
  }

  const cli = parseArgs(process.argv.slice(2))

  if (!cli.file) {
    usage()
    throw new Error('Thiếu --file')
  }

  const absCsvPath = path.resolve(cli.file)
  if (!fs.existsSync(absCsvPath)) {
    throw new Error(`Không tìm thấy file: ${absCsvPath}`)
  }

  const inferred = inferFromFilename(absCsvPath)

  const stage = cli.stage || inferred.stage
  const subject = cli.subject || inferred.subject
  const unit = cli.unit || inferred.unit
  const lesson = cli.lesson || inferred.lesson

  if (!stage || !subject || !unit || !lesson) {
    usage()
    throw new Error('Thiếu metadata. Cần đủ stage, subject, unit, lesson (hoặc tên file đúng chuẩn để auto-detect).')
  }

  const csvContent = fs.readFileSync(absCsvPath, 'utf8')
  const rows = parseCsv(csvContent)
  validateRows(rows)

  const grade = await resolveGradeId(stage)
  const subjectRow = await resolveSubjectId(subject)
  const { unit: unitRow, lesson: lessonRow } = await resolveUnitAndLesson(
    grade.id,
    subjectRow.id,
    unit,
    lesson
  )

  console.log('📥 CSV Import (Generic)')
  console.log(`   File: ${absCsvPath}`)
  console.log(`   Grade: ${grade.name} (${grade.slug})`)
  console.log(`   Subject: ${subjectRow.name} (${subjectRow.slug})`)
  console.log(`   Unit: ${unitRow.title} (${unitRow.unit_number})`)
  console.log(`   Lesson: ${lessonRow.title} (${lessonRow.lesson_number})`)
  console.log(`   Rows: ${rows.length}`)
  if (cli.dryRun) {
    console.log('   Mode: dry-run\n')
  } else {
    console.log('')
  }

  let inserted = 0
  let updated = 0

  for (const row of rows) {
    if (cli.dryRun) {
      console.log(`🔎 Q${row.order_index}: would upsert`) 
      continue
    }

    const { data: existing, error: findError } = await supabase
      .from('exercises')
      .select('id')
      .eq('lesson_id', lessonRow.id)
      .eq('order_index', row.order_index)
      .maybeSingle()

    if (findError) {
      console.log(`❌ Q${row.order_index}: lỗi tìm bài hiện có - ${findError.message}`)
      continue
    }

    const payload = {
      question: row.question,
      question_type: row.question_type,
      difficulty: row.difficulty,
      points: row.points,
      is_active: row.is_active,
      image_url: row.image_url,
      correct_answer: row.correct_answer,
      explanation: row.explanation,
      hint: row.hint,
      topic_id: null,
      lesson_id: lessonRow.id,
      order_index: row.order_index,
    }

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from('exercises')
        .update(payload)
        .eq('id', existing.id)

      if (updateError) {
        console.log(`❌ Q${row.order_index}: update fail - ${updateError.message}`)
      } else {
        updated += 1
        console.log(`♻️  Q${row.order_index}: updated`)
        if (row.question_type === 'true_false') {
          await upsertTrueFalseOptions(existing.id, row.correct_answer)
        } else if (row.question_type === 'multiple_choice') {
          await upsertMultipleChoiceOptions(existing.id, row)
        }
      }
    } else {
      const { data: insertedRow, error: insertError } = await supabase
        .from('exercises')
        .insert(payload)
        .select('id')
        .single()

      if (insertError) {
        console.log(`❌ Q${row.order_index}: insert fail - ${insertError.message}`)
      } else {
        inserted += 1
        console.log(`✅ Q${row.order_index}: inserted`)
        if (row.question_type === 'true_false') {
          await upsertTrueFalseOptions(insertedRow.id, row.correct_answer)
        } else if (row.question_type === 'multiple_choice') {
          await upsertMultipleChoiceOptions(insertedRow.id, row)
        }
      }
    }
  }

  if (cli.dryRun) {
    console.log('\n✅ Dry-run hoàn tất. Không có thay đổi trên database.')
    return
  }

  const lessonExerciseCount = await recomputeCounters(grade.id, subjectRow.id, lessonRow.id)

  const importedImagePaths = [...new Set(
    rows
      .map((row) => row.image_url)
      .filter((value) => typeof value === 'string' && value.startsWith('images/'))
  )]

  let imageSyncSummary = null
  if (!cli.skipImageSync && importedImagePaths.length > 0) {
    console.log('\n🖼️ Syncing exercise images to Supabase Storage...')
    imageSyncSummary = await uploadExerciseImages({
      onlyImagePaths: importedImagePaths,
    })
  }

  console.log('\n' + '─'.repeat(52))
  console.log(`🎉 Done: ${inserted} inserted, ${updated} updated`)
  console.log(`📊 Lesson ${lessonRow.lesson_number} now has: ${lessonExerciseCount} exercises`)
  if (imageSyncSummary) {
    console.log(`🖼️ Image sync: ${imageSyncSummary.uploadedFiles} uploaded, ${imageSyncSummary.updatedRows} rows updated`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌', error.message)
    process.exit(1)
  })
