import { eq } from 'drizzle-orm'
import { clients } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const id = Number(getRouterParam(event, 'id'))

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, id))
    .limit(1)

  if (!client) {
    throw createError({ statusCode: 404, statusMessage: 'Kunde nicht gefunden' })
  }

  return client
})
