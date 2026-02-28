/**
 * run-migration.js
 * Chạy SQL migration trực tiếp lên Supabase qua pg-meta endpoint
 * Usage: node scripts/run-migration.js supabase/migrations/004_topic_id_nullable.sql
 */
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

async function runMigration(sqlFilePath) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local')
    process.exit(1)
  }

  const absPath = path.resolve(sqlFilePath)
  if (!fs.existsSync(absPath)) {
    console.error(`❌ File không tồn tại: ${absPath}`)
    process.exit(1)
  }

  const sql = fs.readFileSync(absPath, 'utf8')
  console.log(`📄 Chạy migration: ${sqlFilePath}\n`)

  // Supabase pg-meta endpoint (available for all hosted projects)
  const endpoint = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`

  // Try pg-meta path first
  const pgMetaEndpoint = SUPABASE_URL.replace('.supabase.co', '.supabase.co') + '/pg/query'
  
  // Strip comment lines, then split by ; into individual statements
  const stripped = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')

  const statements = stripped
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)

  let successCount = 0

  for (const statement of statements) {
    const fullStmt = statement + ';'
    console.log(`  ▶ ${fullStmt.split('\n')[0].slice(0, 70)}`)

    // Method: use Supabase's internal pg endpoint via service role
    const res = await fetch(pgMetaEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'x-connection-encrypted': 'true',
      },
      body: JSON.stringify({ query: fullStmt }),
    })

    if (res.ok) {
      console.log('    ✅ OK')
      successCount++
    } else {
      const text = await res.text()
      // Ignore "column already has NOT NULL" and similar benign errors
      if (text.includes('does not exist') || text.includes('already')) {
        console.log(`    ⏭️  Bỏ qua (không cần thiết): ${text.slice(0, 80)}`)
        successCount++
      } else {
        console.error(`    ❌ Lỗi: ${text.slice(0, 200)}`)
      }
    }
  }

  console.log(`\n✅ Hoàn tất! ${successCount}/${statements.length} statements thành công.`)
}

const sqlFile = process.argv[2]
if (!sqlFile) {
  console.error('Usage: node scripts/run-migration.js <path-to-sql-file>')
  process.exit(1)
}

runMigration(sqlFile)
  .then(() => process.exit(0))
  .catch(err => { console.error('❌', err.message); process.exit(1) })
