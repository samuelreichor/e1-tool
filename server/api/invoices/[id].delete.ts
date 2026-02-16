import { eq } from 'drizzle-orm'
import { invoices } from '~~/server/db/schema'

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

  if (invoice.status !== 'draft') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nur Entwürfe können gelöscht werden'
    })
  }

  await db.delete(invoices).where(eq(invoices.id, id))

  return { success: true }
})
