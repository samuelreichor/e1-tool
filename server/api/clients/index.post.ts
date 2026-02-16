import { clients } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const body = await readBody(event)
  const data = clientSchema.parse(body)

  const [client] = await db.insert(clients).values({
    name: data.name,
    email: data.email || null,
    street: data.street || null,
    city: data.city || null,
    zip: data.zip || null,
    country: data.country || 'AT',
    taxId: data.taxId || null,
    hourlyRate: data.hourlyRate ? String(data.hourlyRate) : null
  }).returning()

  return client
})
