const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── Translation map for units ────────────────────────────────────────────────
const unitsTranslations = [
  {
    id: 1,
    title: 'Counting Numbers 1-5',
    slug: 'counting-numbers-1-5',
    description: 'Learn to count from 1 to 5 with vivid illustrations',
  },
  {
    id: 2,
    title: 'Numbers 1 to 10',
    slug: 'numbers-1-to-10',
    description: 'Learn to count and recognise numbers from 1 to 10',
  },
  {
    id: 3,
    title: 'Recognising Colours',
    slug: 'recognising-colours',
    description: 'Learn to recognise basic colours: red, blue, yellow',
  },
  {
    id: 4,
    // title already English
    description: 'Learn about numbers from 1–10 and basic counting',
  },
  {
    id: 5,
    // title already English
    description: 'Learn basic addition with numbers from 1–10',
  },
  {
    id: 8,
    // title already English
    description: 'Number system, counting, negative numbers and place value',
  },
  {
    id: 9,
    // title already English
    description: 'Reading time, duration and timetables',
  },
  {
    id: 10,
    // title already English
    description: 'Advanced addition and subtraction of whole numbers',
  },
  {
    id: 11,
    // title already English
    description: 'Probability and likelihood of events',
  },
  {
    id: 12,
    // title already English
    description: 'Multiplication, multiples and factors',
  },
]

// ── Translation map for topics (legacy) ─────────────────────────────────────
const topicsTranslations = [
  {
    id: 1,
    title: 'Counting Numbers 1-5',
    slug: 'counting-numbers-1-5',
    description: 'Learn to count from 1 to 5 with vivid illustrations',
  },
  {
    id: 2,
    title: 'Numbers 1 to 10',
    slug: 'numbers-1-to-10',
    description: 'Learn to count and recognise numbers from 1 to 10',
  },
  {
    id: 3,
    title: 'Recognising Colours',
    slug: 'recognising-colours',
    description: 'Learn to recognise basic colours: red, blue, yellow',
  },
]

async function translateTable(tableName, translations) {
  console.log(`\n📝 Translating table: ${tableName}`)
  let successCount = 0
  let failCount = 0

  for (const row of translations) {
    const { id, ...fields } = row
    // Only include fields that have a value (skip undeclared ones)
    const updatePayload = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    )

    const { error } = await supabase
      .from(tableName)
      .update(updatePayload)
      .eq('id', id)

    if (error) {
      console.error(`  ❌ id=${id}: ${error.message}`)
      failCount++
    } else {
      console.log(`  ✅ id=${id}: updated`)
      successCount++
    }
  }

  console.log(`  → ${successCount} rows updated, ${failCount} errors`)
}

async function main() {
  console.log('🌐 Translating units and topics to English...')

  await translateTable('units', unitsTranslations)
  await translateTable('topics', topicsTranslations)

  console.log('\n✅ Done!')
}

main().catch(console.error)
