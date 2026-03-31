import { eq } from 'drizzle-orm'
import { receipts } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const data = receiptSchema.parse(body)

  const [existing] = await db
    .select()
    .from(receipts)
    .where(eq(receipts.id, id))
    .limit(1)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Beleg nicht gefunden' })
  }

  const [updated] = await db.update(receipts).set({
    bookingDate: data.bookingDate,
    partnerName: data.partnerName || null,
    partnerIban: data.partnerIban || null,
    paymentReference: data.paymentReference || null,
    amountEur: String(data.amountEur),
    vatRate: data.vatRate ?? 0,
    category: data.category || 'Sonstige',
    excluded: data.excluded ? 1 : 0
  }).where(eq(receipts.id, id)).returning()

  return updated
})
