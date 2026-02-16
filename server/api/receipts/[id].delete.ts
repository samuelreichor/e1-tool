import { eq } from 'drizzle-orm'
import { receipts } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const id = Number(getRouterParam(event, 'id'))

  const [receipt] = await db
    .delete(receipts)
    .where(eq(receipts.id, id))
    .returning()

  if (!receipt) {
    throw createError({ statusCode: 404, statusMessage: 'Beleg nicht gefunden' })
  }

  return { success: true }
})
