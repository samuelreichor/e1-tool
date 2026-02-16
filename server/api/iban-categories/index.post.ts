import { eq } from 'drizzle-orm'
import { ibanCategories, receipts } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const body = await readBody(event)

  if (!body.iban || !body.name) {
    throw createError({ statusCode: 400, statusMessage: 'IBAN und Name sind erforderlich' })
  }

  const iban = body.iban.trim()
  const name = body.name.trim()
  const excluded = body.excluded ? 1 : 0
  const matchType = body.matchType === 'partner_name' ? 'partner_name' : 'iban'

  // Upsert: insert or update existing
  const [category] = await db
    .insert(ibanCategories)
    .values({ iban, name, excluded, matchType })
    .onConflictDoUpdate({
      target: ibanCategories.iban,
      set: { name, excluded, matchType }
    })
    .returning()

  // Update all existing receipts matching this key
  const matchColumn = matchType === 'partner_name' ? receipts.partnerName : receipts.partnerIban
  await db
    .update(receipts)
    .set({ category: name, excluded })
    .where(eq(matchColumn, iban))

  return category
})
