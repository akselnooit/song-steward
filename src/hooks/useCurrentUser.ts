import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { WorshipLeader } from '../lib/types'

interface CurrentUser {
  user: User | null
  leader: WorshipLeader | null
  loading: boolean
}

export function useCurrentUser(): CurrentUser {
  const [user, setUser] = useState<User | null>(null)
  const [leader, setLeader] = useState<WorshipLeader | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user?.email) {
        const { data } = await supabase
          .from('worship_leaders')
          .select('id, name, auth_user_id, email')
          .eq('email', user.email)
          .maybeSingle()
        setLeader(data)
      }
      setLoading(false)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      if (!session) setLeader(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, leader, loading }
}
