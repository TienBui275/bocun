import { createClient } from '@/lib/supabase/server'

export default async function TestDBPage() {
  const supabase = await createClient()

  // Get list of grades
  const { data: grades, error: gradesError } = await supabase
    .from('grades')
    .select('*')
    .order('level_order')

  // Get list of subjects
  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('*')

  // Get list of topics
  const { data: topics, error: topicsError } = await supabase
    .from('topics')
    .select(`
      *,
      grades (name, slug),
      subjects (name, slug)
    `)
    .limit(10)

  if (gradesError || subjectsError) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h1>❌ Database Connection Error</h1>
        <p style={{ color: 'red' }}>
          {gradesError?.message || subjectsError?.message}
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>✅ Database Connection Test - Cun Bo Project</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Database connection successful! Here is the data from Supabase.
      </p>

      {/* Grades Section */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ 
          fontSize: '1.5rem', 
          marginBottom: '1rem',
          borderBottom: '2px solid #3b82f6',
          paddingBottom: '0.5rem'
        }}>
          📚 Grades ({grades?.length || 0})
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {grades?.map(grade => (
            <div 
              key={grade.id}
              style={{
                padding: '1rem',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: grade.color + '15',
                borderLeftColor: grade.color,
                borderLeftWidth: '4px'
              }}
            >
              <div style={{ 
                display: 'inline-block',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: grade.color,
                color: 'white',
                textAlign: 'center',
                lineHeight: '32px',
                fontWeight: 'bold',
                marginBottom: '0.5rem'
              }}>
                {grade.badge_label}
              </div>
              <h3 style={{ margin: '0.5rem 0', fontSize: '1.1rem' }}>{grade.name}</h3>
              <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>
                {grade.description}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.5rem' }}>
                Level: {grade.level_order} | Slug: {grade.slug}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Subjects Section */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ 
          fontSize: '1.5rem', 
          marginBottom: '1rem',
          borderBottom: '2px solid #10b981',
          paddingBottom: '0.5rem'
        }}>
          📖 Subjects ({subjects?.length || 0})
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
          {subjects?.map(subject => (
            <div 
              key={subject.id}
              style={{
                padding: '1.5rem',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                textAlign: 'center',
                backgroundColor: subject.color + '10',
                transition: 'transform 0.2s',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                {subject.icon}
              </div>
              <h3 style={{ margin: '0.5rem 0', color: subject.color }}>
                {subject.name}
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#999', margin: 0 }}>
                {subject.slug}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Topics Section */}
      <section>
        <h2 style={{ 
          fontSize: '1.5rem', 
          marginBottom: '1rem',
          borderBottom: '2px solid #f59e0b',
          paddingBottom: '0.5rem'
        }}>
          📝 Topics ({topics?.length || 0})
        </h2>
        {topicsError ? (
          <p style={{ color: '#999' }}>No topics found. Please run the seed script!</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {topics?.map(topic => (
              <div 
                key={topic.id}
                style={{
                  padding: '1rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: '#f9fafb'
                }}
              >
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#1f2937' }}>
                  {topic.title}
                </h3>
                <p style={{ fontSize: '0.9rem', color: '#666', margin: '0.5rem 0' }}>
                  {topic.description}
                </p>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#999' }}>
                  <span>📚 {topic.grades?.name}</span>
                  <span>📖 {topic.subjects?.name}</span>
                  <span>📊 {topic.exercise_count} exercises</span>
                  <span>🔢 Order: {topic.order_index}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Connection Info */}
      <section style={{ 
        marginTop: '3rem', 
        padding: '1rem', 
        backgroundColor: '#ecfdf5', 
        borderRadius: '8px',
        border: '1px solid #10b981'
      }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#059669' }}>✅ Database Connection OK</h3>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#047857' }}>
          Connected to Supabase successfully! You can start developing the application.
        </p>
      </section>
    </div>
  )
}
