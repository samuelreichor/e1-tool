import { eq } from 'drizzle-orm'
import { clients } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const data = clientSchema.parse(body)

  const [client] = await db
    .update(clients)
    .set({
      name: data.name,
      email: data.email || null,
      street: data.street || null,
      city: data.city || null,
      zip: data.zip || null,
      country: data.country || 'AT',
      taxId: data.taxId || null,
      hourlyRate: data.hourlyRate ? String(data.hourlyRate) : null,
      updatedAt: new Date()
    })
    .where(eq(clients.id, id))
    .returning()

  if (!client) {
    throw createError({ statusCode: 404, statusMessage: 'Kunde nicht gefunden' })
  }

  return client
})
