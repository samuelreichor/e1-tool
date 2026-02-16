import { eq, count } from 'drizzle-orm'
import { clients, invoices } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const id = Number(getRouterParam(event, 'id'))

  // Check if client has invoices
  const [result] = await db
    .select({ count: count() })
    .from(invoices)
    .where(eq(invoices.clientId, id))

  if (result && result.count > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Kunde kann nicht gelöscht werden, da Rechnungen vorhanden sind'
    })
  }

  const [client] = await db
    .delete(clients)
    .where(eq(clients.id, id))
    .returning()

  if (!client) {
    throw createError({ statusCode: 404, statusMessage: 'Kunde nicht gefunden' })
  }

  return { success: true }
})
