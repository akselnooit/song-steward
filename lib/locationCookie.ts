// Server-side: read cookie
import { cookies } from 'next/headers'

export async function getLocationIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('ss_location_id')?.value ?? null
}
