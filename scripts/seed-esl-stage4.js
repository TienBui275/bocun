const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

const unitsData = [
    { unit_number: 1, title: "Unit 1: Our community", slug: "unit-1-our-community" },
    { unit_number: 2, title: "Unit 2: Earth and beyond", slug: "unit-2-earth-and-beyond" },
    { unit_number: 3, title: "Unit 3: Homes", slug: "unit-3-homes" },
    { unit_number: 4, title: "Unit 4: Food", slug: "unit-4-food" },
    { unit_number: 5, title: "Unit 5: Adventures", slug: "unit-5-adventures" },
    { unit_number: 6, title: "Unit 6: Going places", slug: "unit-6-going-places" },
    { unit_number: 7, title: "Unit 7: Australia", slug: "unit-7-australia" },
    { unit_number: 8, title: "Unit 8: Nature Matters", slug: "unit-8-nature-matters" },
    { unit_number: 9, title: "Unit 9: School's out", slug: "unit-9-schools-out" }
];

async function main() {
    console.log('Fetching Stage 4 grade...');
    const { data: grades } = await supabase.from('grades').select('id, slug').in('slug', ['lop-4', 'stage-4']);
    if (!grades || grades.length === 0) throw new Error('Stage 4 not found');
    const gradeId = grades[0].id;

    console.log('Fetching ESL subject...');
    const { data: subjects } = await supabase.from('subjects').select('id, slug').eq('slug', 'esl');
    if (!subjects || subjects.length === 0) throw new Error('ESL subject not found');
    const subjectId = subjects[0].id;

    console.log(`Grade ID: ${gradeId}, Subject ID: ${subjectId}`);

    for (let u of unitsData) {
        console.log(`Upserting ${u.title}...`);
        const { data: unit, error: unitError } = await supabase.from('units').upsert({
            grade_id: gradeId,
            subject_id: subjectId,
            title: u.title,
            slug: u.slug,
            unit_number: u.unit_number,
            order_index: u.unit_number,
            is_active: true
        }, { onConflict: 'grade_id,subject_id,slug' }).select().single();

        if (unitError) throw new Error(`Unit error: ${unitError.message}`);

        const unitId = unit.id;
        console.log(`> Unit ID: ${unitId}`);
    }

    console.log('Seeding grade_subjects counts...');
    const { execSync } = require('child_process');
    execSync('node scripts/seed-grade-subjects.js', { stdio: 'inherit' });

    console.log('Success!');
}

main().catch(console.error);
