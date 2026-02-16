import { eq } from 'drizzle-orm'
import { invoices } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const { status } = invoiceStatusSchema.parse(body)

  const [invoice] = await db
    .update(invoices)
    .set({ status, updatedAt: new Date() })
    .where(eq(invoices.id, id))
    .returning()

  if (!invoice) {
    throw createError({ statusCode: 404, statusMessage: 'Rechnung nicht gefunden' })
  }

  return invoice
})
