const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const PROJECT_ROOT = path.resolve(__dirname, '..')
require('dotenv').config({ path: path.join(PROJECT_ROOT, '.env.local') })

const BUCKET_NAME = process.env.EXERCISE_IMAGE_BUCKET || 'exercise-images'
const STORAGE_PREFIX = process.env.EXERCISE_IMAGE_PREFIX || 'math/stage-4/unit-1'
const IMAGE_DIR_INPUT = process.env.EXERCISE_IMAGE_DIR || 'data/images'
const LOCAL_IMAGE_DIR = path.isAbsolute(IMAGE_DIR_INPUT)
  ? IMAGE_DIR_INPUT
  : path.join(PROJECT_ROOT, IMAGE_DIR_INPUT)

function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.svg') return 'image/svg+xml'
  return 'application/octet-stream'
}

async function ensureBucket(supabase, bucketName) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()
  if (listError) throw listError

  const exists = (buckets || []).some((bucket) => bucket.name === bucketName)
  if (exists) {
    console.log(`ℹ️ Bucket exists: ${bucketName}`)
    return
  }

  const { error: createError } = await supabase.storage.createBucket(bucketName, {
    public: true,
    fileSizeLimit: '10MB',
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'],
  })

  if (createError) throw createError
  console.log(`✅ Created bucket: ${bucketName}`)
}

function normalizeImagePaths(onlyImagePaths) {
  const imagePaths = Array.isArray(onlyImagePaths) ? onlyImagePaths : []
  const normalizedImagePaths = [...new Set(
    imagePaths
      .map((item) => String(item || '').trim())
      .filter((item) => item.startsWith('images/'))
  )]

  const fileNames = [...new Set(
    normalizedImagePaths
      .map((item) => item.replace(/^images\//, ''))
      .filter((item) => item.length > 0)
  )]

  return { normalizedImagePaths, fileNames }
}

async function uploadExerciseImages(options = {}) {
  const {
    onlyImagePaths = null,
    bucketName = BUCKET_NAME,
    storagePrefix = STORAGE_PREFIX,
    imageDir = LOCAL_IMAGE_DIR,
  } = options

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  }

  if (!fs.existsSync(imageDir)) {
    throw new Error(`Image directory not found: ${imageDir}`)
  }

  const { normalizedImagePaths, fileNames: targetFileNames } = normalizeImagePaths(onlyImagePaths)

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  await ensureBucket(supabase, bucketName)

  let imageFiles = fs
    .readdirSync(imageDir)
    .filter((fileName) => fs.statSync(path.join(imageDir, fileName)).isFile())
    .filter((fileName) => /\.(png|jpe?g|webp|gif|svg)$/i.test(fileName))

  if (targetFileNames.length > 0) {
    const targetSet = new Set(targetFileNames)
    imageFiles = imageFiles.filter((fileName) => targetSet.has(fileName))
  }

  if (!imageFiles.length) {
    console.log('⚠️ No image files found. Nothing to upload.')
    return {
      uploadedFiles: 0,
      updatedRows: 0,
      skippedRows: 0,
      sampleRows: [],
    }
  }

  const publicUrlByFileName = new Map()

  for (const fileName of imageFiles) {
    const fullPath = path.join(imageDir, fileName)
    const storagePath = `${storagePrefix}/${fileName}`
    const binary = fs.readFileSync(fullPath)

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, binary, {
        contentType: getContentType(fileName),
        upsert: true,
      })

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from(bucketName).getPublicUrl(storagePath)
    publicUrlByFileName.set(fileName, data.publicUrl)
    console.log(`⬆️ Uploaded: ${fileName}`)
  }

  let selectQuery = supabase
    .from('exercises')
    .select('id,image_url')
    .like('image_url', 'images/%')

  if (normalizedImagePaths.length > 0) {
    selectQuery = selectQuery.in('image_url', normalizedImagePaths)
  }

  const { data: rows, error: selectError } = await selectQuery

  if (selectError) throw selectError

  let updateCount = 0
  let skippedCount = 0

  for (const row of rows || []) {
    const fileName = String(row.image_url).replace(/^images\//, '')
    const publicUrl = publicUrlByFileName.get(fileName)

    if (!publicUrl) {
      console.log(`⚠️ Skip exercise ${row.id}: local file not found for ${row.image_url}`)
      skippedCount += 1
      continue
    }

    const { error: updateError } = await supabase
      .from('exercises')
      .update({ image_url: publicUrl })
      .eq('id', row.id)

    if (updateError) throw updateError
    updateCount += 1
  }

  console.log('────────────────────────────────')
  console.log(`📦 Uploaded files: ${imageFiles.length}`)
  console.log(`🛠️ Updated exercises.image_url: ${updateCount}`)
  if (skippedCount > 0) {
    console.log(`⚠️ Skipped rows: ${skippedCount}`)
  }

  const { data: sampleRows, error: sampleError } = await supabase
    .from('exercises')
    .select('id, image_url')
    .not('image_url', 'is', null)
    .order('id', { ascending: true })
    .limit(10)

  if (sampleError) throw sampleError

  console.log('🔎 Sample image_url rows:')
  for (const row of sampleRows || []) {
    console.log(`  - ${row.id}: ${row.image_url}`)
  }

  return {
    uploadedFiles: imageFiles.length,
    updatedRows: updateCount,
    skippedRows: skippedCount,
    sampleRows: sampleRows || [],
  }
}

async function main() {
  await uploadExerciseImages()
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Upload failed:', error.message || error)
    process.exit(1)
  })
}

module.exports = {
  uploadExerciseImages,
}
