// Migration script: populate location_id and category_id on services
// Run AFTER supabase/01_locations_categories.sql has been executed.
// Then run supabase/02_finalize_migration.sql to make columns NOT NULL and drop old table.

const url = 'https://nnwgazsjtvauweiqjgvk.supabase.co'
const key = 'sb_publishable_PaQe3v3Nkcuaj_I96tY4gw_6a_3cJyS'
const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
}

async function fetchAll(table, select = '*') {
  const results = []
  let from = 0
  while (true) {
    const res = await fetch(
      `${url}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=1000&offset=${from}`,
      { headers: { ...headers, 'Range-Unit': 'items', Range: `${from}-${from + 999}` } }
    )
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Failed to fetch ${table}: ${res.status} ${text}`)
    }
    const data = await res.json()
    results.push(...data)
    if (data.length < 1000) break
    from += 1000
  }
  return results
}

async function main() {
  console.log('Fetching service_types...')
  const serviceTypes = await fetchAll('service_types')
  console.log(`  Found ${serviceTypes.length} service types`)

  console.log('Fetching locations...')
  const locations = await fetchAll('locations')
  console.log(`  Found ${locations.length} locations:`, locations.map((l) => l.name))

  console.log('Fetching service_categories...')
  const categories = await fetchAll('service_categories')
  console.log(`  Found ${categories.length} categories:`, categories.map((c) => c.name))

  // Build lookup maps
  const locationByName = new Map(locations.map((l) => [l.name, l.id]))
  const categoryByName = new Map(categories.map((c) => [c.name, c.id]))

  // Parse service type names into { locationName, categoryName }
  // Format: "Location - Category" or just "Location" (defaults to Ogólne)
  const serviceTypeMap = new Map()
  for (const st of serviceTypes) {
    const dashIdx = st.name.indexOf(' - ')
    let locationName, categoryName
    if (dashIdx !== -1) {
      locationName = st.name.slice(0, dashIdx).trim()
      categoryName = st.name.slice(dashIdx + 3).trim()
    } else {
      // e.g. "Ukraina" — no category, default to Ogólne
      locationName = st.name.trim()
      categoryName = 'Ogólne'
    }

    const locationId = locationByName.get(locationName)
    const categoryId = categoryByName.get(categoryName)

    if (!locationId) {
      console.warn(`  WARNING: No location found for "${locationName}" (from service type "${st.name}")`)
      continue
    }
    if (!categoryId) {
      console.warn(`  WARNING: No category found for "${categoryName}" (from service type "${st.name}")`)
      continue
    }

    serviceTypeMap.set(st.id, { locationId, categoryId, locationName, categoryName })
    console.log(`  Mapped: "${st.name}" → ${locationName} / ${categoryName}`)
  }

  console.log('\nFetching services (with pagination)...')
  const services = await fetchAll('services', 'id,service_type_id')
  console.log(`  Found ${services.length} services`)

  let updated = 0
  let skipped = 0
  let errors = 0

  for (const service of services) {
    const mapping = serviceTypeMap.get(service.service_type_id)
    if (!mapping) {
      console.warn(`  SKIP service ${service.id}: no mapping for service_type_id=${service.service_type_id}`)
      skipped++
      continue
    }

    const res = await fetch(`${url}/rest/v1/services?id=eq.${service.id}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({
        location_id: mapping.locationId,
        category_id: mapping.categoryId,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`  ERROR updating service ${service.id}: ${res.status} ${text}`)
      errors++
    } else {
      updated++
    }
  }

  console.log('\nMigration complete:')
  console.log(`  Updated: ${updated}`)
  console.log(`  Skipped: ${skipped}`)
  console.log(`  Errors:  ${errors}`)

  if (errors === 0 && skipped === 0) {
    console.log('\nAll services migrated successfully.')
    console.log('You can now run supabase/02_finalize_migration.sql in the Supabase Dashboard.')
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
