import { ibanCategories, receipts } from '~~/server/db/schema'

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current)
  return fields
}

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Keine Datei hochgeladen' })
  }

  const file = formData.find(f => f.name === 'file')
  if (!file || !file.data) {
    throw createError({ statusCode: 400, statusMessage: 'Keine CSV-Datei gefunden' })
  }

  const content = file.data.toString('utf-8')
  const lines = content.split(/\r?\n/).filter(l => l.trim())

  if (lines.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'CSV-Datei ist leer' })
  }

  // Skip header line
  const header = parseCsvLine(lines[0]!)
  const bookingDateIdx = header.indexOf('Booking Date')
  const valueDateIdx = header.indexOf('Value Date')
  const partnerNameIdx = header.indexOf('Partner Name')
  const partnerIbanIdx = header.indexOf('Partner Iban')
  const typeIdx = header.indexOf('Type')
  const paymentRefIdx = header.indexOf('Payment Reference')
  const amountIdx = header.indexOf('Amount (EUR)')
  const origAmountIdx = header.indexOf('Original Amount')
  const origCurrencyIdx = header.indexOf('Original Currency')
  const exchangeRateIdx = header.indexOf('Exchange Rate')

  if (bookingDateIdx === -1 || amountIdx === -1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiges CSV-Format: Booking Date und Amount (EUR) sind erforderlich' })
  }

  // Load IBAN categories (split by match type)
  const categories = await db.select().from(ibanCategories)
  const ibanMatchMap = new Map<string, { name: string, excluded: number }>()
  const nameMatchMap = new Map<string, { name: string, excluded: number }>()
  for (const c of categories) {
    const entry = { name: c.name, excluded: c.excluded }
    if (c.matchType === 'partner_name') nameMatchMap.set(c.iban, entry)
    else ibanMatchMap.set(c.iban, entry)
  }

  const rows = lines.slice(1).map(line => {
    const fields = parseCsvLine(line)
    const partnerIban = fields[partnerIbanIdx] || null
    const partnerName = fields[partnerNameIdx] || null
    const match = (partnerIban && ibanMatchMap.get(partnerIban))
      || (partnerName && nameMatchMap.get(partnerName))
      || undefined

    return {
      bookingDate: fields[bookingDateIdx]!,
      valueDate: fields[valueDateIdx] || null,
      partnerName,
      partnerIban,
      type: fields[typeIdx] || null,
      paymentReference: fields[paymentRefIdx] || null,
      amountEur: fields[amountIdx]!,
      originalAmount: fields[origAmountIdx] || null,
      originalCurrency: fields[origCurrencyIdx] || null,
      exchangeRate: fields[exchangeRateIdx] || null,
      category: match?.name || 'Sonstige',
      excluded: match?.excluded || 0
    }
  })

  let imported = 0
  // Insert in batches of 50
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50)
    const result = await db.insert(receipts).values(batch).onConflictDoNothing().returning({ id: receipts.id })
    imported += result.length
  }

  return {
    imported,
    skipped: rows.length - imported,
    total: rows.length
  }
})
