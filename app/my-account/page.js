import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MyAccountClient from '@/components/My-Account/MyAccountClient'

export default async function MyAccountPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Get user info from public.users table
  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return <MyAccountClient user={user} userProfile={userProfile} />
}
