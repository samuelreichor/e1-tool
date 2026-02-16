import ExcelJS from 'exceljs'
import { and, gte, lt, desc } from 'drizzle-orm'
import { receipts } from '~~/server/db/schema'

const currencyFormat = '#.##0,00 €'
const dateFormat = 'DD.MM.YYYY'

function applyHeaderStyle(row: ExcelJS.Row) {
  row.font = { bold: true }
  row.alignment = { horizontal: 'center' }
  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' }
    }
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } }
    }
  })
}

function applySumStyle(row: ExcelJS.Row) {
  row.font = { bold: true }
  row.eachCell((cell) => {
    cell.border = {
      top: { style: 'double', color: { argb: 'FF334155' } }
    }
  })
}

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const query = getQuery(event)
  const year = Number(query.year) || new Date().getFullYear()

  const startDate = `${year}-01-01`
  const endDate = `${year + 1}-01-01`

  const allReceipts = await db
    .select()
    .from(receipts)
    .where(and(
      gte(receipts.bookingDate, startDate),
      lt(receipts.bookingDate, endDate)
    ))
    .orderBy(desc(receipts.bookingDate))

  const included = allReceipts.filter(r => !r.excluded)
  const einnahmen = included.filter(r => parseFloat(r.amountEur) > 0)
  const ausgaben = included.filter(r => parseFloat(r.amountEur) < 0)

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'E1-Tool'
  workbook.created = new Date()

  // --- Sheet: Einnahmen ---
  const wsEin = workbook.addWorksheet('Einnahmen')
  wsEin.columns = [
    { header: 'Datum', key: 'datum', width: 14 },
    { header: 'Belegnr.', key: 'nr', width: 10 },
    { header: 'Partner', key: 'partner', width: 28 },
    { header: 'Beschreibung', key: 'beschreibung', width: 36 },
    { header: 'Kategorie', key: 'kategorie', width: 18 },
    { header: 'Netto', key: 'netto', width: 14 },
    { header: '20% USt', key: 'ust', width: 14 },
    { header: 'Brutto', key: 'brutto', width: 14 }
  ]
  applyHeaderStyle(wsEin.getRow(1))

  einnahmen.forEach((r, i) => {
    const brutto = parseFloat(r.amountEur)
    const netto = brutto / 1.20
    const ust = brutto - netto
    const row = wsEin.addRow({
      datum: new Date(r.bookingDate),
      nr: i + 1,
      partner: r.partnerName || '',
      beschreibung: r.paymentReference || '',
      kategorie: r.category,
      netto: Math.round(netto * 100) / 100,
      ust: Math.round(ust * 100) / 100,
      brutto
    })
    row.getCell('datum').numFmt = dateFormat
    row.getCell('netto').numFmt = currencyFormat
    row.getCell('ust').numFmt = currencyFormat
    row.getCell('brutto').numFmt = currencyFormat
  })

  // Summenzeile
  if (einnahmen.length > 0) {
    const lastRow = einnahmen.length + 1
    const sumRow = wsEin.addRow({
      datum: null,
      nr: null,
      partner: null,
      beschreibung: null,
      kategorie: 'Summe',
      netto: { formula: `SUM(F2:F${lastRow})` },
      ust: { formula: `SUM(G2:G${lastRow})` },
      brutto: { formula: `SUM(H2:H${lastRow})` }
    })
    sumRow.getCell('netto').numFmt = currencyFormat
    sumRow.getCell('ust').numFmt = currencyFormat
    sumRow.getCell('brutto').numFmt = currencyFormat
    applySumStyle(sumRow)
  }

  // --- Sheet: Ausgaben ---
  const wsAus = workbook.addWorksheet('Ausgaben')
  wsAus.columns = [
    { header: 'Datum', key: 'datum', width: 14 },
    { header: 'Belegnr.', key: 'nr', width: 10 },
    { header: 'Partner', key: 'partner', width: 28 },
    { header: 'Beschreibung', key: 'beschreibung', width: 36 },
    { header: 'Kategorie', key: 'kategorie', width: 18 },
    { header: 'Netto', key: 'netto', width: 14 },
    { header: '20% Vorsteuer', key: 'vorsteuer', width: 14 },
    { header: 'Brutto', key: 'brutto', width: 14 }
  ]
  applyHeaderStyle(wsAus.getRow(1))

  ausgaben.forEach((r, i) => {
    const brutto = Math.abs(parseFloat(r.amountEur))
    const netto = brutto / 1.20
    const vorsteuer = brutto - netto
    const row = wsAus.addRow({
      datum: new Date(r.bookingDate),
      nr: i + 1,
      partner: r.partnerName || '',
      beschreibung: r.paymentReference || '',
      kategorie: r.category,
      netto: Math.round(netto * 100) / 100,
      vorsteuer: Math.round(vorsteuer * 100) / 100,
      brutto
    })
    row.getCell('datum').numFmt = dateFormat
    row.getCell('netto').numFmt = currencyFormat
    row.getCell('vorsteuer').numFmt = currencyFormat
    row.getCell('brutto').numFmt = currencyFormat
  })

  if (ausgaben.length > 0) {
    const lastRow = ausgaben.length + 1
    const sumRow = wsAus.addRow({
      datum: null,
      nr: null,
      partner: null,
      beschreibung: null,
      kategorie: 'Summe',
      netto: { formula: `SUM(F2:F${lastRow})` },
      vorsteuer: { formula: `SUM(G2:G${lastRow})` },
      brutto: { formula: `SUM(H2:H${lastRow})` }
    })
    sumRow.getCell('netto').numFmt = currencyFormat
    sumRow.getCell('vorsteuer').numFmt = currencyFormat
    sumRow.getCell('brutto').numFmt = currencyFormat
    applySumStyle(sumRow)
  }

  // --- Sheet: Zusammenfassung ---
  const wsSum = workbook.addWorksheet('Zusammenfassung')
  wsSum.columns = [
    { header: '', key: 'label', width: 30 },
    { header: 'Netto', key: 'netto', width: 18 },
    { header: 'Brutto', key: 'brutto', width: 18 }
  ]
  applyHeaderStyle(wsSum.getRow(1))

  const einnahmenBrutto = einnahmen.reduce((sum, r) => sum + parseFloat(r.amountEur), 0)
  const einnahmenNetto = einnahmenBrutto / 1.20
  const einnahmenUst = einnahmenBrutto - einnahmenNetto

  const ausgabenBrutto = ausgaben.reduce((sum, r) => sum + Math.abs(parseFloat(r.amountEur)), 0)
  const ausgabenNetto = ausgabenBrutto / 1.20
  const ausgabenVorsteuer = ausgabenBrutto - ausgabenNetto

  const addSumRow = (label: string, netto: number, brutto: number) => {
    const row = wsSum.addRow({ label, netto: Math.round(netto * 100) / 100, brutto: Math.round(brutto * 100) / 100 })
    row.getCell('netto').numFmt = currencyFormat
    row.getCell('brutto').numFmt = currencyFormat
    return row
  }

  addSumRow(`Einnahmen ${year}`, einnahmenNetto, einnahmenBrutto)
  addSumRow(`Ausgaben ${year}`, ausgabenNetto, ausgabenBrutto)

  const gewinnRow = addSumRow('Gewinn/Verlust', einnahmenNetto - ausgabenNetto, einnahmenBrutto - ausgabenBrutto)
  gewinnRow.font = { bold: true }

  wsSum.addRow({})

  const ustRow = wsSum.addRow({
    label: 'Vereinnahmte USt (20%)',
    netto: Math.round(einnahmenUst * 100) / 100
  })
  ustRow.getCell('netto').numFmt = currencyFormat

  const vstRow = wsSum.addRow({
    label: 'Vorsteuer (20%)',
    netto: Math.round(ausgabenVorsteuer * 100) / 100
  })
  vstRow.getCell('netto').numFmt = currencyFormat

  const zahllastRow = wsSum.addRow({
    label: 'USt-Zahllast',
    netto: Math.round((einnahmenUst - ausgabenVorsteuer) * 100) / 100
  })
  zahllastRow.getCell('netto').numFmt = currencyFormat
  zahllastRow.font = { bold: true }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()

  setResponseHeaders(event, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="EA-Rechnung-${year}.xlsx"`
  })

  return buffer
})
