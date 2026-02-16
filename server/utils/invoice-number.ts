import { like, desc } from 'drizzle-orm'
import { invoices } from '../db/schema'

export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `RE-${year}-`

  const [last] = await db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(like(invoices.invoiceNumber, `${prefix}%`))
    .orderBy(desc(invoices.invoiceNumber))
    .limit(1)

  let nextNum = 1
  if (last) {
    const lastNum = parseInt(last.invoiceNumber.split('-')[2] ?? '', 10)
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1
    }
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`
}
