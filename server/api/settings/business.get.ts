import { businessSettings } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const [settings] = await db.select().from(businessSettings).limit(1)

  return settings || null
})
