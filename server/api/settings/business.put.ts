import { eq } from 'drizzle-orm'
import { businessSettings } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const body = await readBody(event)
  const data = businessSettingsSchema.parse(body)

  const [existing] = await db.select({ id: businessSettings.id }).from(businessSettings).limit(1)

  if (existing) {
    const [updated] = await db
      .update(businessSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(businessSettings.id, existing.id))
      .returning()
    return updated
  } else {
    const [created] = await db
      .insert(businessSettings)
      .values(data)
      .returning()
    return created
  }
})
