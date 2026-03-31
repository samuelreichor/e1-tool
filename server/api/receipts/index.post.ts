import { receipts } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const body = await readBody(event)
  const data = receiptSchema.parse(body)

  const [receipt] = await db.insert(receipts).values({
    bookingDate: data.bookingDate,
    partnerName: data.partnerName || null,
    partnerIban: data.partnerIban || null,
    paymentReference: data.paymentReference || null,
    amountEur: String(data.amountEur),
    vatRate: data.vatRate ?? 0,
    category: data.category || 'Sonstige',
    excluded: data.excluded ? 1 : 0
  }).returning()

  return receipt
})
