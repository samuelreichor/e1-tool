import { eq } from 'drizzle-orm'
import { receipts } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const id = Number(getRouterParam(event, 'id'))

  const [receipt] = await db
    .select()
    .from(receipts)
    .where(eq(receipts.id, id))
    .limit(1)

  if (!receipt) {
    throw createError({ statusCode: 404, statusMessage: 'Beleg nicht gefunden' })
  }

  const formData = await readMultipartFormData(event)
  const file = formData?.find(f => f.name === 'file')

  if (!file || !file.data) {
    throw createError({ statusCode: 400, statusMessage: 'Keine Datei hochgeladen' })
  }

  if (file.type !== 'application/pdf') {
    throw createError({ statusCode: 400, statusMessage: 'Nur PDF-Dateien sind erlaubt' })
  }

  const fileName = file.filename || `beleg-${receipt.id}.pdf`

  const result = await uploadReceiptPdfToDrive({
    buffer: Buffer.from(file.data),
    fileName,
    bookingDate: receipt.bookingDate
  })

  return { success: true, fileId: result.id, fileName: result.name }
})
