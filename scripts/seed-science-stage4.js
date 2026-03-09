const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

const unitsData = [
    {
        unit_number: 1,
        title: "Unit 1: Living things",
        slug: "unit-1-living-things",
        lessons: [
            { lesson_number: "1.1", title: "1.1 Bones and skeletons" },
            { lesson_number: "1.2", title: "1.2 Why we need a skeleton" },
            { lesson_number: "1.3", title: "1.3 Skeletons and movement" },
            { lesson_number: "1.4", title: "1.4 Different kinds of skeletons" },
            { lesson_number: "1.5", title: "1.5 Medicines and infectious diseases" }
        ]
    },
    {
        unit_number: 2,
        title: "Unit 2: Energy",
        slug: "unit-2-energy",
        lessons: [
            { lesson_number: "2.1", title: "2.1 Energy around us" },
            { lesson_number: "2.2", title: "2.2 Energy transfers" },
            { lesson_number: "2.3", title: "2.3 Energy changes" },
            { lesson_number: "2.4", title: "2.4 Energy and living things" }
        ]
    },
    {
        unit_number: 3,
        title: "Unit 3: Materials",
        slug: "unit-3-materials",
        lessons: [
            { lesson_number: "3.1", title: "3.1 Materials, substances and particles" },
            { lesson_number: "3.2", title: "3.2 How do solids and liquids behave?" },
            { lesson_number: "3.3", title: "3.3 Melting and solidifying" },
            { lesson_number: "3.4", title: "3.4 Chemical reactions" }
        ]
    },
    {
        unit_number: 4,
        title: "Unit 4: Earth and its habitats",
        slug: "unit-4-earth-and-its-habitats",
        lessons: [
            { lesson_number: "4.1", title: "4.1 The structure of the Earth" },
            { lesson_number: "4.2", title: "4.2 Volcanoes" },
            { lesson_number: "4.3", title: "4.3 Earthquakes" },
            { lesson_number: "4.4", title: "4.4 Different habitats" }
        ]
    },
    {
        unit_number: 5,
        title: "Unit 5: Light",
        slug: "unit-5-light",
        lessons: [
            { lesson_number: "5.1", title: "5.1 How we see things" },
            { lesson_number: "5.2", title: "5.2 Light travels in straight lines" },
            { lesson_number: "5.3", title: "5.3 Light reflects off different surfaces" },
            { lesson_number: "5.4", title: "5.4 Light in the solar system" },
            { lesson_number: "5.5", title: "5.5 Day and night" },
            { lesson_number: "5.6", title: "5.6 Investigating shadow lengths" }
        ]
    },
    {
        unit_number: 6,
        title: "Unit 6: Electricity",
        slug: "unit-6-electricity",
        lessons: [
            { lesson_number: "6.1", title: "6.1 Which materials conduct electricity?" },
            { lesson_number: "6.2", title: "6.2 Does water conduct electricity?" },
            { lesson_number: "6.3", title: "6.3 Using conductors and insulators in electrical appliances" },
            { lesson_number: "6.4", title: "6.4 Switches" },
            { lesson_number: "6.5", title: "6.5 Changing the number of components in a circuit" }
        ]
    }
];

function generateSlug(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

async function main() {
    console.log('Fetching Stage 4 grade...');
    const { data: grades } = await supabase.from('grades').select('id, slug').in('slug', ['lop-4', 'stage-4']);
    if (!grades || grades.length === 0) throw new Error('Stage 4 not found');
    const gradeId = grades[0].id;

    console.log('Fetching Science subject...');
    const { data: subjects } = await supabase.from('subjects').select('id, slug').eq('slug', 'science');
    if (!subjects || subjects.length === 0) throw new Error('Khoa hoc subject not found');
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

        for (let i = 0; i < u.lessons.length; i++) {
            const l = u.lessons[i];
            const lSlug = generateSlug(l.title.replace(/\./g, '-'));

            console.log(`  Upserting Lesson: ${l.title} (slug: ${lSlug})`);
            const { error: lessonError } = await supabase.from('lessons').upsert({
                unit_id: unitId,
                title: l.title,
                slug: lSlug,
                lesson_number: l.lesson_number,
                order_index: i + 1,
                is_active: true
            }, { onConflict: 'unit_id,slug' });

            if (lessonError) throw new Error(`Lesson error: ${lessonError.message}`);
        }
    }

    console.log('Seeding grade_subjects counts...');
    const { execSync } = require('child_process');
    execSync('node scripts/seed-grade-subjects.js', { stdio: 'inherit' });

    console.log('Success!');
}

main().catch(console.error);
