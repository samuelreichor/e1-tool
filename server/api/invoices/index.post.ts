import { invoices, invoiceItems } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const body = await readBody(event)
  const data = invoiceSchema.parse(body)

  const invoiceNumber = await generateInvoiceNumber()

  // Calculate totals server-side
  let netTotal = 0
  let vatTotal = 0

  const itemsWithTotals = data.items.map((item, index) => {
    const lineTotal = item.quantity * item.unitPrice
    const lineVat = lineTotal * (item.vatRate / 100)
    netTotal += lineTotal
    vatTotal += lineVat

    return {
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
      vatRate: String(item.vatRate),
      lineTotal: String(lineTotal.toFixed(2)),
      sortOrder: item.sortOrder ?? index
    }
  })

  const grossTotal = netTotal + vatTotal

  const [invoice] = await db.insert(invoices).values({
    invoiceNumber,
    clientId: data.clientId,
    status: 'draft',
    issueDate: data.issueDate || null,
    dueDate: data.dueDate || null,
    serviceDateFrom: data.serviceDateFrom || null,
    serviceDateTo: data.serviceDateTo || null,
    reverseCharge: data.reverseCharge ? 1 : 0,
    paymentTerms: data.paymentTerms || null,
    notes: data.notes || null,
    netTotal: netTotal.toFixed(2),
    vatTotal: vatTotal.toFixed(2),
    grossTotal: grossTotal.toFixed(2)
  }).returning()

  if (itemsWithTotals.length > 0) {
    await db.insert(invoiceItems).values(
      itemsWithTotals.map(item => ({
        ...item,
        invoiceId: invoice.id
      }))
    )
  }

  return invoice
})
