import { asc } from 'drizzle-orm'
import { ibanCategories } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  return await db
    .select()
    .from(ibanCategories)
    .orderBy(asc(ibanCategories.name))
})
