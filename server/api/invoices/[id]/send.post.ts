import { eq, asc } from 'drizzle-orm'
import { invoices, clients, invoiceItems, businessSettings, emailLogs } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const { recipient, subject, body: emailBody, templateKey } = sendInvoiceEmailSchema.parse(body)

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1)

  if (!invoice) {
    throw createError({ statusCode: 404, statusMessage: 'Rechnung nicht gefunden' })
  }

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, invoice.clientId))
    .limit(1)

  if (!client) {
    throw createError({ statusCode: 404, statusMessage: 'Kunde nicht gefunden' })
  }

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .orderBy(asc(invoiceItems.sortOrder))

  const [business] = await db.select().from(businessSettings).limit(1)

  const pdfBuffer = await generateInvoicePdf({
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    serviceDateFrom: invoice.serviceDateFrom,
    serviceDateTo: invoice.serviceDateTo,
    reverseCharge: invoice.reverseCharge === 1,
    paymentTerms: invoice.paymentTerms,
    notes: invoice.notes,
    netTotal: invoice.netTotal,
    vatTotal: invoice.vatTotal,
    grossTotal: invoice.grossTotal,
    client: {
      name: client.name,
      street: client.street,
      city: client.city,
      zip: client.zip,
      country: client.country,
      taxId: client.taxId
    },
    items: items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate,
      lineTotal: item.lineTotal,
      sortOrder: item.sortOrder
    })),
    business: business || null
  })

  const html = wrapInHtml(emailBody)

  try {
    await sendMail({
      to: recipient,
      subject,
      html,
      attachments: [{
        filename: `${invoice.invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
        contentDisposition: 'attachment'
      }]
    })

    await uploadPdfToDrive({
      buffer: pdfBuffer,
      fileName: `${invoice.invoiceNumber}.pdf`,
      issueDate: invoice.issueDate!
    })

    await db.insert(emailLogs).values({
      invoiceId: id,
      recipient,
      subject,
      templateKey: templateKey || null,
      status: 'sent'
    })

    if (invoice.status === 'draft') {
      await db.update(invoices).set({ status: 'sent' }).where(eq(invoices.id, id))
    }

    return { success: true }
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Unbekannter Fehler'

    await db.insert(emailLogs).values({
      invoiceId: id,
      recipient,
      subject,
      templateKey: templateKey || null,
      status: 'failed',
      errorMessage
    })

    throw createError({
      statusCode: 500,
      statusMessage: 'E-Mail konnte nicht gesendet werden',
      data: { message: errorMessage }
    })
  }
})
