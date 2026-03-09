/**
 * process-lesson-folder.js
 *
 * All-in-one script:
 *   1. Dùng Claude Vision đọc tất cả ảnh trong folder → tạo file Excel tự động
 *   2. Crop/copy ảnh phụ vào data/images/
 *   3. Upload ảnh lên Supabase Storage
 *   4. Import exercises vào Supabase database
 *
 * LUỒNG SỬ DỤNG:
 *   1. Tạo folder với ảnh bài tập (vd: data/Math_Stage_4_Unit_1_Lesson_1.3)
 *   2. Thêm ANTHROPIC_API_KEY vào .env.local
 *   3. Chạy script:
 *        node scripts/process-lesson-folder.js --folder data/Math_Stage_4_Unit_1_Lesson_1.3
 *
 * Script sẽ tự:
 *   - Phân tích ảnh bằng Claude Vision → tạo file Excel <FolderName>.xlsx
 *   - Nếu Excel đã tồn tại: bỏ qua bước AI (dùng lại Excel cũ)
 *   - Crop/copy ảnh từ ảnh gốc → data/images/
 *   - Upload ảnh + import exercises lên Supabase
 *
 * ENV cần có trong .env.local:
 *   ANTHROPIC_API_KEY=sk-ant-...
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *
 * FLAGS:
 *   --folder <path>        Folder chứa ảnh (bắt buộc, hoặc dùng CWD)
 *   --force-ai-extract     Buộc chạy lại AI kể cả khi Excel đã tồn tại
 *   --skip-ai-extract      Bỏ qua AI, dùng Excel có sẵn trong folder
 *   --skip-import          Chỉ tạo Excel + crop ảnh, không import lên DB
 *   --skip-image-sync      Bỏ qua bước upload ảnh lên Supabase Storage
 *   --skip-crop            Bỏ qua bước crop ảnh
 *   --create-template      Tạo file Excel mẫu rỗng rồi thoát
 *   --dry-run              Parse + validate only, không ghi DB
 *   --stage <n>            Override stage  (auto-detect từ tên folder)
 *   --subject <s>          Override subject (auto-detect từ tên folder)
 *   --unit <n>             Override unit   (auto-detect từ tên folder)
 *   --lesson <n>           Override lesson (auto-detect từ tên folder)
 *   --model <id>           Claude model ID (mặc định: claude-haiku-4-5)
 */

const fs   = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const Anthropic = require('@anthropic-ai/sdk')

const PROJECT_ROOT = path.resolve(__dirname, '..')
require('dotenv').config({ path: path.join(PROJECT_ROOT, '.env.local') })

// ─── Lazy-load optional packages ──────────────────────────────────────────────

function requireOptional(name, hint) {
  try {
    return require(name)
  } catch {
    console.error(`❌ Missing package: "${name}"`)
    console.error(`   Install it with: npm install ${hint || name}`)
    process.exit(1)
  }
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    dryRun:          false,
    skipImport:      false,
    skipImageSync:   false,
    skipCrop:        false,
    createTemplate:  false,
    skipAiExtract:   false,
    forceAiExtract:  false,
    model:           'claude-haiku-4-5',
  }

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]
    if (!token.startsWith('--')) continue
    const key = token.slice(2)

    if (key === 'dry-run')           { args.dryRun          = true; continue }
    if (key === 'skip-import')       { args.skipImport      = true; continue }
    if (key === 'skip-image-sync')   { args.skipImageSync   = true; continue }
    if (key === 'skip-crop')         { args.skipCrop        = true; continue }
    if (key === 'create-template')   { args.createTemplate  = true; continue }
    if (key === 'skip-ai-extract')   { args.skipAiExtract   = true; continue }
    if (key === 'force-ai-extract')  { args.forceAiExtract  = true; continue }

    const value = argv[i + 1]
    if (!value || value.startsWith('--')) {
      console.warn(`⚠️  Missing value for --${key}, ignoring.`)
      continue
    }
    args[key] = value
    i++
  }

  return args
}

// ─── Image name prefix helper ─────────────────────────────────────────────────

/**
 * Tạo prefix cho tên file ảnh từ metadata.
 * Ví dụ: subject=Math, stage=4, unit=1, lesson=1.3 → "math_s4_u1_l1.3"
 */
function buildImageNamePrefix(folderPath) {
  const inferred = inferMetadataFromFolderName(path.basename(folderPath))
  if (!inferred.subject) return path.basename(folderPath).toLowerCase().replace(/[^a-z0-9]/g, '_')
  const subj = inferred.subject.toLowerCase()
  return `${subj}_s${inferred.stage}_u${inferred.unit}_l${inferred.lesson}`
}

function inferMetadataFromFolderName(folderName) {
  const match = folderName.match(/^(.+?)_Stage_(\d+)_Unit_(\d+)_Lesson_([\d.]+)$/i)
  if (!match) return {}
  return { subject: match[1], stage: match[2], unit: match[3], lesson: match[4] }
}

// ─── Folder / metadata helpers ────────────────────────────────────────────────

function resolveFolderPath(cli) {
  if (cli.folder) {
    const abs = path.isAbsolute(cli.folder)
      ? cli.folder
      : path.resolve(process.cwd(), cli.folder)
    if (!fs.existsSync(abs)) {
      throw new Error(`Folder not found: ${abs}`)
    }
    return abs
  }
  // fallback: cwd
  return process.cwd()
}

function inferMetadataFromFolder(folderPath) {
  return inferMetadataFromFolderName(path.basename(folderPath))
}

// ─── Claude Vision: extract exercises from images ────────────────────────────

const CLAUDE_SYSTEM_PROMPT = `You are an expert math curriculum analyst.
Your task is to extract every exercise from the provided images and return them as a JSON array.
Return ONLY a valid JSON array — no markdown, no code fences, no commentary.

Each element in the array must have these fields:
- order_index     (integer, 1-based, sequential across ALL images)
- question        (string, full question text in English. Include context like "Look at the number line." if relevant)
- question_type   (string: "fill_blank", "multiple_choice", or "true_false")
- difficulty      (integer: 1=easy, 2=medium, 3=hard)
- points          (integer, default 10)
- correct_answer  (string — for fill_blank/true_false; null for multiple_choice)
- explanation     (string — step-by-step solution; generate one if not shown)
- hint            (string — short hint for student; generate one if not shown; can be null)
- source_image    (string — filename of the image this exercise appears in, e.g. "1.png")
- has_figure      (boolean — true if the exercise requires a diagram/chart/number line/illustration)
- figure_crop_pct (object or null — only when has_figure=true:
                     { "x": 0.0, "y": 0.0, "w": 1.0, "h": 0.5 }
                   values are fractions of image width/height, range 0.0–1.0
                   crop the TIGHTEST bounding box around the figure, NOT the full image)
- option_a        (string or null)
- option_b        (string or null)
- option_c        (string or null)
- option_d        (string or null)
- correct_option  (string or null — "A", "B", "C", or "D" for multiple_choice)

Rules:
- Number exercises sequentially (order_index 1, 2, 3...) even across multiple images.
- For true_false: set correct_answer to "true" or "false".
- For multiple_choice: set correct_answer to null; use option_a/b/c/d and correct_option.
- For fill_blank: set correct_answer to the expected answer (number or short text).
- If multiple exercises share the same figure (same diagram), each should reference the SAME crop.
- Do NOT include instructions or lesson headers as exercises.
- Generate explanation and hint if they are not explicitly shown in the image.
- Preserve ALL mathematical notation exactly (°, ×, ÷, −, ≥, etc.).
`

/**
 * Gửi ảnh lên Claude Vision → trả về mảng exercise objects.
 */
async function analyzeImagesWithClaude(folderPath, model) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      'Missing ANTHROPIC_API_KEY in .env.local.\n' +
      '   Add: ANTHROPIC_API_KEY=sk-ant-...'
    )
  }

  const sharp = requireOptional('sharp')

  // Collect image files sorted naturally (1.png, 2.png, ...)
  const imageExts   = /\.(png|jpe?g|webp)$/i
  const imageFiles  = fs
    .readdirSync(folderPath)
    .filter((f) => imageExts.test(f) && !f.startsWith('.'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))

  if (imageFiles.length === 0) {
    throw new Error(`No image files found in: ${folderPath}`)
  }

  console.log(`\n🤖 Claude Vision: analysing ${imageFiles.length} image(s)...`)
  imageFiles.forEach((f, i) => console.log(`   ${i + 1}. ${f}`))

  // Build message content: system instructions are in system prompt;
  // user message contains the images + a brief instruction.
  const userContent = []

  for (const fileName of imageFiles) {
    const filePath = path.join(folderPath, fileName)
    const ext      = path.extname(fileName).toLowerCase().replace('.', '')
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
      : ext === 'webp' ? 'image/webp'
      : 'image/png'

    const base64 = fs.readFileSync(filePath).toString('base64')

    userContent.push({
      type  : 'text',
      text  : `Image file: "${fileName}"`,
    })
    userContent.push({
      type  : 'image',
      source: { type: 'base64', media_type: mimeType, data: base64 },
    })
  }

  userContent.push({
    type: 'text',
    text: 'Extract ALL exercises from the images above and return a JSON array as instructed.',
  })

  const client = new Anthropic({ apiKey })

  console.log(`   Sending to Claude (${model})...`)
  const response = await client.messages.create({
    model,
    max_tokens : 8192,
    system     : CLAUDE_SYSTEM_PROMPT,
    messages   : [{ role: 'user', content: userContent }],
  })

  const rawText = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()

  // Strip markdown code fences if Claude wrapped in ```json ... ```
  const jsonText = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  let exercises
  try {
    exercises = JSON.parse(jsonText)
  } catch (err) {
    console.error('\n❌ Failed to parse Claude response as JSON.')
    console.error('   Raw response saved to: claude_response_debug.txt')
    fs.writeFileSync(path.join(folderPath, 'claude_response_debug.txt'), rawText, 'utf8')
    throw new Error(`JSON parse error: ${err.message}`)
  }

  if (!Array.isArray(exercises)) {
    throw new Error('Claude returned non-array JSON. Expected an array of exercises.')
  }

  console.log(`   ✅ Claude extracted ${exercises.length} exercise(s)`)

  // ── Get image dimensions for % → pixel crop conversion ──────────────────
  const imageDimensions = {}
  for (const fileName of imageFiles) {
    const meta = await sharp(path.join(folderPath, fileName)).metadata()
    imageDimensions[fileName] = { w: meta.width, h: meta.height }
  }

  // ── Build image name prefix  e.g. "math_s4_u1_l1.3" ─────────────────────
  const prefix = buildImageNamePrefix(folderPath)

  // ── Normalise each exercise into Excel row format ────────────────────────
  const rows = exercises.map((ex) => {
    const srcImg = ex.source_image || null
    const dims   = srcImg ? imageDimensions[srcImg] : null

    let crop_x = null, crop_y = null, crop_w = null, crop_h = null
    let image_url = null

    if (ex.has_figure && ex.figure_crop_pct && dims) {
      const pct = ex.figure_crop_pct
      crop_x = Math.round(pct.x * dims.w)
      crop_y = Math.round(pct.y * dims.h)
      crop_w = Math.round(pct.w * dims.w)
      crop_h = Math.round(pct.h * dims.h)
      image_url = `images/${prefix}_q${ex.order_index}.png`
    }

    return {
      order_index   : ex.order_index,
      question      : ex.question      ?? '',
      question_type : ex.question_type ?? 'fill_blank',
      difficulty    : ex.difficulty    ?? 1,
      points        : ex.points        ?? 10,
      is_active     : 'TRUE',
      source_image  : srcImg ?? '',
      crop_x        : crop_x ?? '',
      crop_y        : crop_y ?? '',
      crop_w        : crop_w ?? '',
      crop_h        : crop_h ?? '',
      image_url     : image_url ?? '',
      correct_answer: ex.correct_answer ?? '',
      explanation   : ex.explanation   ?? '',
      hint          : ex.hint          ?? '',
      option_a      : ex.option_a      ?? '',
      option_b      : ex.option_b      ?? '',
      option_c      : ex.option_c      ?? '',
      option_d      : ex.option_d      ?? '',
      correct_option: ex.correct_option ?? '',
    }
  })

  return rows
}

/**
 * Ghi mảng rows vào file Excel trong folderPath.
 */
function writeExcelFromRows(rows, folderPath) {
  const XLSX        = requireOptional('xlsx')
  const folderName  = path.basename(folderPath)
  const xlsxPath    = path.join(folderPath, `${folderName}.xlsx`)

  const ws  = XLSX.utils.json_to_sheet(rows, { header: TEMPLATE_COLUMNS })
  if (!ws['!cols']) ws['!cols'] = []
  TEMPLATE_COLUMNS.forEach((col, i) => {
    ws['!cols'][i] = { wch: Math.max(14, col.length + 2) }
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Exercises')
  XLSX.writeFile(wb, xlsxPath)

  console.log(`\n📊 Excel saved: ${xlsxPath}`)
  console.log('   Bạn có thể mở file để kiểm tra/chỉnh sửa trước khi import.')
  return xlsxPath
}

// ─── Excel helpers ────────────────────────────────────────────────────────────

const TEMPLATE_COLUMNS = [
  'order_index',
  'question',
  'question_type',
  'difficulty',
  'points',
  'is_active',
  'source_image',
  'crop_x',
  'crop_y',
  'crop_w',
  'crop_h',
  'image_url',
  'correct_answer',
  'explanation',
  'hint',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct_option',
]

const SAMPLE_ROWS = [
  {
    order_index   : 1,
    question      : 'Sample fill-blank question?',
    question_type : 'fill_blank',
    difficulty    : 1,
    points        : 10,
    is_active     : 'TRUE',
    source_image  : '1.png',
    crop_x        : '',
    crop_y        : '',
    crop_w        : '',
    crop_h        : '',
    image_url     : 'images/lesson_q1.png',
    correct_answer: '42',
    explanation   : 'Because 6 × 7 = 42.',
    hint          : 'Think about multiplication.',
    option_a      : '',
    option_b      : '',
    option_c      : '',
    option_d      : '',
    correct_option: '',
  },
  {
    order_index   : 2,
    question      : 'Sample multiple-choice question: what is 2 + 2?',
    question_type : 'multiple_choice',
    difficulty    : 1,
    points        : 10,
    is_active     : 'TRUE',
    source_image  : '',
    crop_x        : '',
    crop_y        : '',
    crop_w        : '',
    crop_h        : '',
    image_url     : '',
    correct_answer: '',
    explanation   : '2 + 2 equals 4.',
    hint          : 'Count up from 2.',
    option_a      : '3',
    option_b      : '4',
    option_c      : '5',
    option_d      : '6',
    correct_option: 'B',
  },
]

function createTemplateExcel(folderPath) {
  const XLSX = requireOptional('xlsx')
  const folderName = path.basename(folderPath)
  const xlsxPath   = path.join(folderPath, `${folderName}.xlsx`)

  if (fs.existsSync(xlsxPath)) {
    console.log(`ℹ️  Template already exists: ${xlsxPath}`)
    return xlsxPath
  }

  const ws = XLSX.utils.json_to_sheet(SAMPLE_ROWS, { header: TEMPLATE_COLUMNS })

  // Style header row (bold)
  if (!ws['!cols']) ws['!cols'] = []
  TEMPLATE_COLUMNS.forEach((_, i) => {
    ws['!cols'][i] = { wch: Math.max(12, TEMPLATE_COLUMNS[i].length + 2) }
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Exercises')
  XLSX.writeFile(wb, xlsxPath)

  console.log(`✅ Template created: ${xlsxPath}`)
  console.log('   Điền nội dung bài tập vào file Excel rồi chạy lại script.')
  return xlsxPath
}

function readExcel(xlsxPath) {
  const XLSX = requireOptional('xlsx')
  const wb   = XLSX.readFile(xlsxPath)
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null })
  return rows
}

// ─── Row normalisation ────────────────────────────────────────────────────────

function parseBool(value) {
  if (value === null || value === undefined) return true
  const s = String(value).trim().toLowerCase()
  return s === 'true' || s === '1' || s === 'yes'
}

function str(value) {
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  return s.length === 0 ? null : s
}

function num(value, fallback = null) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function normaliseRows(rawRows) {
  return rawRows.map((r) => ({
    order_index   : num(r.order_index),
    question      : str(r.question),
    question_type : str(r.question_type) || 'fill_blank',
    difficulty    : num(r.difficulty, 1),
    points        : num(r.points, 10),
    is_active     : parseBool(r.is_active),
    // image / crop
    source_image  : str(r.source_image),
    crop_x        : num(r.crop_x),
    crop_y        : num(r.crop_y),
    crop_w        : num(r.crop_w),
    crop_h        : num(r.crop_h),
    image_url     : str(r.image_url),
    // content
    correct_answer: str(r.correct_answer),
    explanation   : str(r.explanation),
    hint          : str(r.hint),
    // MC
    option_a      : str(r.option_a),
    option_b      : str(r.option_b),
    option_c      : str(r.option_c),
    option_d      : str(r.option_d),
    correct_option: r.correct_option
      ? String(r.correct_option).trim().toUpperCase()
      : null,
  }))
}

function validateRows(rows) {
  if (!rows.length) throw new Error('Excel has no data rows')
  for (const row of rows) {
    if (!Number.isFinite(row.order_index)) {
      throw new Error('A row is missing order_index or order_index is not a number')
    }
    if (!row.question) throw new Error(`Q${row.order_index}: missing question`)
    if (!['fill_blank', 'multiple_choice', 'true_false'].includes(row.question_type)) {
      throw new Error(
        `Q${row.order_index}: invalid question_type "${row.question_type}" — must be fill_blank | multiple_choice | true_false`
      )
    }
    if (row.question_type === 'multiple_choice') {
      if (!row.option_a || !row.option_b) {
        console.warn(`⚠️  Q${row.order_index}: multiple_choice missing option_a/b — options skipped`)
      }
      if (!row.correct_option) {
        console.warn(`⚠️  Q${row.order_index}: multiple_choice missing correct_option`)
      }
    }
  }
}

// ─── Image crop ───────────────────────────────────────────────────────────────

async function cropImages(rows, folderPath) {
  const sharp        = requireOptional('sharp')
  const imageDataDir = path.join(PROJECT_ROOT, 'data', 'images')

  if (!fs.existsSync(imageDataDir)) {
    fs.mkdirSync(imageDataDir, { recursive: true })
    console.log(`📁 Created: data/images/`)
  }

  let cropped = 0
  let copied  = 0
  let skipped = 0

  for (const row of rows) {
    if (!row.source_image || !row.image_url) { skipped++; continue }

    const srcFile  = path.join(folderPath, row.source_image)
    if (!fs.existsSync(srcFile)) {
      console.warn(`⚠️  Q${row.order_index}: source_image not found → ${srcFile}`)
      skipped++
      continue
    }

    // image_url format: "images/some_name.png" → output: data/images/some_name.png
    const imgFileName = path.basename(row.image_url)
    const destFile    = path.join(imageDataDir, imgFileName)

    const hasCrop = (
      row.crop_x !== null && row.crop_y !== null &&
      row.crop_w !== null && row.crop_h !== null &&
      row.crop_w > 0 && row.crop_h > 0
    )

    try {
      if (hasCrop) {
        await sharp(srcFile)
          .extract({
            left  : Math.round(row.crop_x),
            top   : Math.round(row.crop_y),
            width : Math.round(row.crop_w),
            height: Math.round(row.crop_h),
          })
          .toFile(destFile)
        console.log(`✂️  Q${row.order_index}: cropped ${row.source_image} → ${imgFileName}`)
        cropped++
      } else {
        fs.copyFileSync(srcFile, destFile)
        console.log(`📋 Q${row.order_index}: copied ${row.source_image} → ${imgFileName}`)
        copied++
      }
    } catch (err) {
      console.error(`❌ Q${row.order_index}: image error — ${err.message}`)
      skipped++
    }
  }

  console.log(`   Images: ${cropped} cropped, ${copied} copied, ${skipped} skipped`)
  return { cropped, copied, skipped }
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

function buildSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  }
  return createClient(url, key)
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '-')
}

async function resolveGradeId(supabase, stageValue) {
  const stageNumber = Number(stageValue)
  if (!Number.isFinite(stageNumber)) throw new Error(`Invalid stage: ${stageValue}`)

  const slugCandidates = [`stage-${stageNumber}`, `lop-${stageNumber}`]
  const nameCandidates = [`stage ${stageNumber}`, `grade ${stageNumber}`]

  const { data, error } = await supabase.from('grades').select('id, slug, name')
  if (error) throw new Error(`Error fetching grades: ${error.message}`)

  const grade =
    data.find((r) => slugCandidates.includes(String(r.slug).toLowerCase())) ||
    data.find((r) => nameCandidates.includes(String(r.name).toLowerCase()))
  if (!grade) throw new Error(`Grade not found for Stage ${stageNumber}`)
  return grade
}

async function resolveSubjectId(supabase, subjectValue) {
  const input  = String(subjectValue || '').trim()
  if (!input) throw new Error('Subject is empty')

  const normalized = normalizeText(input)
  const { data, error } = await supabase.from('subjects').select('id, slug, name')
  if (error) throw new Error(`Error fetching subjects: ${error.message}`)

  const subject = data.find((r) => {
    return normalizeText(r.slug) === normalized || normalizeText(r.name) === normalized
  })
  if (!subject) throw new Error(`Subject not found: ${input}`)
  return subject
}

async function resolveUnitAndLesson(supabase, gradeId, subjectId, unitNumber, lessonNumber) {
  const unitNo = Number(unitNumber)
  if (!Number.isFinite(unitNo)) throw new Error(`Invalid unit number: ${unitNumber}`)

  const { data: unit, error: unitError } = await supabase
    .from('units')
    .select('id, title, unit_number')
    .eq('grade_id', gradeId)
    .eq('subject_id', subjectId)
    .eq('unit_number', unitNo)
    .single()
  if (unitError || !unit) throw new Error(`Unit ${unitNo} not found (grade_id=${gradeId}, subject_id=${subjectId})`)

  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id, title, lesson_number')
    .eq('unit_id', unit.id)
    .eq('lesson_number', String(lessonNumber))
    .single()
  if (lessonError || !lesson) throw new Error(`Lesson ${lessonNumber} not found in Unit ${unitNo}`)

  return { unit, lesson }
}

async function upsertMultipleChoiceOptions(supabase, exerciseId, row) {
  const optionDefs = [
    { label: 'A', text: row.option_a },
    { label: 'B', text: row.option_b },
    { label: 'C', text: row.option_c },
    { label: 'D', text: row.option_d },
  ].filter((o) => o.text)

  if (optionDefs.length === 0) {
    console.log(`   ⚠️  Q${row.order_index}: no options found — skipping`)
    return
  }

  const correct = String(row.correct_option ?? '').trim().toUpperCase()
  await supabase.from('exercise_options').delete().eq('exercise_id', exerciseId)
  const { error } = await supabase.from('exercise_options').insert(
    optionDefs.map((o, i) => ({
      exercise_id  : exerciseId,
      option_label : o.label,
      option_text  : o.text,
      is_correct   : o.label === correct,
      order_index  : i + 1,
    }))
  )
  if (error) console.warn(`   ⚠️  exercise_options insert error: ${error.message}`)
}

async function upsertTrueFalseOptions(supabase, exerciseId, correctAnswer) {
  await supabase.from('exercise_options').delete().eq('exercise_id', exerciseId)
  const ca           = String(correctAnswer ?? '').trim().toLowerCase()
  const trueIsCorrect = ca === 'true' || ca === '1' || ca === 'yes'
  const { error } = await supabase.from('exercise_options').insert([
    { exercise_id: exerciseId, option_label: 'A', option_text: 'True',  is_correct:  trueIsCorrect, order_index: 1 },
    { exercise_id: exerciseId, option_label: 'B', option_text: 'False', is_correct: !trueIsCorrect, order_index: 2 },
  ])
  if (error) console.warn(`   ⚠️  exercise_options insert error: ${error.message}`)
}

async function recomputeCounters(supabase, gradeId, subjectId, lessonId) {
  const { count: lessonCount } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .eq('lesson_id', lessonId)

  await supabase.from('lessons').update({ exercise_count: lessonCount || 0 }).eq('id', lessonId)

  const { data: unitRows } = await supabase
    .from('units')
    .select('id')
    .eq('grade_id', gradeId)
    .eq('subject_id', subjectId)

  if (!unitRows?.length) return lessonCount || 0
  const unitIds    = unitRows.map((r) => r.id)

  const { data: lessonRows } = await supabase.from('lessons').select('id').in('unit_id', unitIds)
  if (!lessonRows?.length) return lessonCount || 0
  const lessonIds  = lessonRows.map((r) => r.id)

  const { count: totalExercises } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .in('lesson_id', lessonIds)

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

  return lessonCount || 0
}

// ─── Upload images to Supabase Storage ───────────────────────────────────────

async function uploadAndLinkImages(supabase, rows) {
  const BUCKET       = process.env.EXERCISE_IMAGE_BUCKET  || 'exercise-images'
  const imageDataDir = path.join(PROJECT_ROOT, 'data', 'images')

  // Ensure bucket exists
  const { data: buckets, error: bucketListErr } = await supabase.storage.listBuckets()
  if (bucketListErr) throw bucketListErr

  if (!buckets.some((b) => b.name === BUCKET)) {
    const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
      public       : true,
      fileSizeLimit: '10MB',
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    })
    if (createErr) throw createErr
    console.log(`✅ Storage bucket created: ${BUCKET}`)
  }

  const imageRows = rows.filter(
    (r) => r.image_url && String(r.image_url).startsWith('images/')
  )
  const uniquePaths = [...new Set(imageRows.map((r) => r.image_url))]

  const urlMap = {}  // local image_url → public storage URL
  let uploaded = 0

  for (const imgPath of uniquePaths) {
    const fileName = path.basename(imgPath)
    const localFile = path.join(imageDataDir, fileName)
    if (!fs.existsSync(localFile)) {
      console.warn(`⚠️  Image file not found locally, skipping upload: ${localFile}`)
      continue
    }

    const ext         = path.extname(fileName).toLowerCase()
    const contentType = ext === '.png' ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
      : ext === '.webp' ? 'image/webp'
      : 'image/png'

    const storagePath = imgPath  // e.g. "images/math_s4_u1_l1.3_q1.png"

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fs.readFileSync(localFile), {
        contentType,
        upsert: true,
      })

    if (uploadErr) {
      console.warn(`⚠️  Upload failed for ${fileName}: ${uploadErr.message}`)
      continue
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath)

    urlMap[imgPath] = publicUrlData.publicUrl
    uploaded++
    console.log(`☁️  Uploaded: ${fileName} → ${publicUrlData.publicUrl}`)
  }

  console.log(`   Images uploaded: ${uploaded}/${uniquePaths.length}`)
  return urlMap  // map of local image_url → public URL
}

// ─── Main import logic ────────────────────────────────────────────────────────

async function importToSupabase(supabase, rows, meta, publicUrlMap, dryRun) {
  const grade   = await resolveGradeId(supabase, meta.stage)
  const subject = await resolveSubjectId(supabase, meta.subject)
  const { unit, lesson } = await resolveUnitAndLesson(
    supabase, grade.id, subject.id, meta.unit, meta.lesson
  )

  console.log('\n📥 Importing exercises...')
  console.log(`   Grade  : ${grade.name}`)
  console.log(`   Subject: ${subject.name}`)
  console.log(`   Unit   : ${unit.title} (${unit.unit_number})`)
  console.log(`   Lesson : ${lesson.title} (${lesson.lesson_number})`)
  console.log(`   Rows   : ${rows.length}`)
  if (dryRun) console.log('   Mode   : dry-run\n')

  let inserted = 0
  let updated  = 0

  for (const row of rows) {
    // Resolve final image_url (swap local path → public storage URL if mapped)
    const resolvedImageUrl = (row.image_url && publicUrlMap[row.image_url])
      ? publicUrlMap[row.image_url]
      : row.image_url

    if (dryRun) {
      console.log(`🔎 Q${row.order_index}: "${String(row.question).slice(0, 60)}…" [${row.question_type}]`)
      if (resolvedImageUrl) console.log(`       image_url = ${resolvedImageUrl}`)
      continue
    }

    const { data: existing } = await supabase
      .from('exercises')
      .select('id')
      .eq('lesson_id', lesson.id)
      .eq('order_index', row.order_index)
      .maybeSingle()

    const payload = {
      lesson_id     : lesson.id,
      topic_id      : null,
      order_index   : row.order_index,
      question      : row.question,
      question_type : row.question_type,
      difficulty    : row.difficulty,
      points        : row.points,
      is_active     : row.is_active,
      image_url     : resolvedImageUrl,
      correct_answer: row.correct_answer,
      explanation   : row.explanation,
      hint          : row.hint,
    }

    if (existing?.id) {
      const { error } = await supabase.from('exercises').update(payload).eq('id', existing.id)
      if (error) { console.error(`❌ Q${row.order_index}: update error — ${error.message}`); continue }
      console.log(`♻️  Q${row.order_index}: updated`)
      updated++
      if (row.question_type === 'true_false') await upsertTrueFalseOptions(supabase, existing.id, row.correct_answer)
      else if (row.question_type === 'multiple_choice') await upsertMultipleChoiceOptions(supabase, existing.id, row)
    } else {
      const { data: inserted_row, error } = await supabase
        .from('exercises').insert(payload).select('id').single()
      if (error) { console.error(`❌ Q${row.order_index}: insert error — ${error.message}`); continue }
      console.log(`✅ Q${row.order_index}: inserted`)
      inserted++
      if (row.question_type === 'true_false') await upsertTrueFalseOptions(supabase, inserted_row.id, row.correct_answer)
      else if (row.question_type === 'multiple_choice') await upsertMultipleChoiceOptions(supabase, inserted_row.id, row)
    }
  }

  if (!dryRun) {
    const lessonCount = await recomputeCounters(supabase, grade.id, subject.id, lesson.id)
    console.log(`\n📊 Lesson ${lesson.lesson_number}: ${lessonCount} exercise(s) total`)
  }

  return { inserted, updated }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main() {
  const cli        = parseArgs(process.argv.slice(2))
  const folderPath = resolveFolderPath(cli)
  const folderName = path.basename(folderPath)

  console.log(`\n📂 Folder: ${folderPath}`)

  // ── Create template mode ──────────────────────────────────────────────────
  if (cli.createTemplate) {
    createTemplateExcel(folderPath)
    return
  }

  // ── Determine Excel path ──────────────────────────────────────────────────
  const xlsxPath  = path.join(folderPath, `${folderName}.xlsx`)
  const xlsxExists = fs.existsSync(xlsxPath)

  // ── Claude Vision extraction ──────────────────────────────────────────────
  const needAiExtract = !cli.skipAiExtract && (cli.forceAiExtract || !xlsxExists)

  if (needAiExtract) {
    if (xlsxExists && cli.forceAiExtract) {
      console.log('⚡ --force-ai-extract: re-running Claude Vision even though Excel exists...')
    } else if (!xlsxExists) {
      console.log('🔍 No Excel found — running Claude Vision to extract exercises from images...')
    }

    const aiRows = await analyzeImagesWithClaude(folderPath, cli.model)
    writeExcelFromRows(aiRows, folderPath)
  } else if (cli.skipAiExtract) {
    console.log('⏭️  --skip-ai-extract: using existing Excel.')
  } else {
    console.log(`📊 Excel found — skipping AI extraction. Use --force-ai-extract to re-run.`)
  }

  if (!fs.existsSync(xlsxPath)) {
    console.error(`\n❌ Excel file still not found after AI extraction: ${xlsxPath}`)
    process.exit(1)
  }

  console.log(`📊 Excel  : ${xlsxPath}`)

  // ── Parse Excel ───────────────────────────────────────────────────────────
  const rawRows = readExcel(xlsxPath)
  const rows    = normaliseRows(rawRows)
  validateRows(rows)
  console.log(`   Rows   : ${rows.length}`)

  // ── Metadata ──────────────────────────────────────────────────────────────
  const inferred = inferMetadataFromFolder(folderPath)
  const meta = {
    stage  : cli.stage   || inferred.stage,
    subject: cli.subject || inferred.subject,
    unit   : cli.unit    || inferred.unit,
    lesson : cli.lesson  || inferred.lesson,
  }

  if (!meta.stage || !meta.subject || !meta.unit || !meta.lesson) {
    console.error('\n❌ Cannot infer stage/subject/unit/lesson from folder name.')
    console.error('   Folder name pattern: <Subject>_Stage_<N>_Unit_<N>_Lesson_<N.N>')
    console.error('   Example: Math_Stage_4_Unit_1_Lesson_1.3')
    console.error('   Or provide overrides: --stage 4 --subject math --unit 1 --lesson 1.3\n')
    process.exit(1)
  }

  console.log(`   Stage  : ${meta.stage}  Subject: ${meta.subject}  Unit: ${meta.unit}  Lesson: ${meta.lesson}`)

  // ── Crop images ───────────────────────────────────────────────────────────
  if (!cli.skipCrop) {
    const rowsWithImages = rows.filter((r) => r.source_image && r.image_url)
    if (rowsWithImages.length > 0) {
      console.log(`\n✂️  Cropping / copying images (${rowsWithImages.length} rows have source_image)...`)
      await cropImages(rows, folderPath)
    }
  }

  // ── Skip import mode ──────────────────────────────────────────────────────
  if (cli.skipImport) {
    console.log('\n⏭️  --skip-import flag set. Stopping before DB import.')
    return
  }

  // ── Supabase ──────────────────────────────────────────────────────────────
  const supabase = buildSupabase()

  // ── Upload images ─────────────────────────────────────────────────────────
  let publicUrlMap = {}
  if (!cli.skipImageSync) {
    const rowsWithImageUrl = rows.filter((r) => r.image_url)
    if (rowsWithImageUrl.length > 0) {
      console.log('\n☁️  Uploading images to Supabase Storage...')
      publicUrlMap = await uploadAndLinkImages(supabase, rows)
    }
  }

  // ── Import to DB ──────────────────────────────────────────────────────────
  const { inserted, updated } = await importToSupabase(
    supabase, rows, meta, publicUrlMap, cli.dryRun
  )

  if (!cli.dryRun) {
    console.log('\n' + '─'.repeat(52))
    console.log(`🎉 Done: ${inserted} inserted, ${updated} updated`)
  } else {
    console.log('\n✅ Dry-run complete. No changes made to database.')
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌', err.message)
    process.exit(1)
  })
