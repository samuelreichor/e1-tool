import { eq, asc } from 'drizzle-orm'
import { invoices, clients, invoiceItems } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const id = Number(getRouterParam(event, 'id'))

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1)

  if (!invoice) {
    throw createError({ statusCode: 404, statusMessage: 'Rechnung nicht gefunden' })
  }

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, invoice.clientId))
    .limit(1)

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .orderBy(asc(invoiceItems.sortOrder))

  return {
    ...invoice,
    client,
    items
  }
})
