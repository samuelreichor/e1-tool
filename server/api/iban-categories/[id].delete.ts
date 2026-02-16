import { eq } from 'drizzle-orm'
import { ibanCategories, receipts } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const id = Number(getRouterParam(event, 'id'))

  const [category] = await db
    .delete(ibanCategories)
    .where(eq(ibanCategories.id, id))
    .returning()

  if (!category) {
    throw createError({ statusCode: 404, statusMessage: 'Kategorie nicht gefunden' })
  }

  // Reset matching receipts to "Sonstige"
  const matchColumn = category.matchType === 'partner_name' ? receipts.partnerName : receipts.partnerIban
  await db
    .update(receipts)
    .set({ category: 'Sonstige', excluded: 0 })
    .where(eq(matchColumn, category.iban))

  return { success: true }
})
