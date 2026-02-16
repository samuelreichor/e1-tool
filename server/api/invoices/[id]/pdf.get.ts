import { eq, asc } from 'drizzle-orm'
import { invoices, clients, invoiceItems, businessSettings } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const id = Number(getRouterParam(event, 'id'))

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

  setHeaders(event, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`
  })

  return pdfBuffer
})
