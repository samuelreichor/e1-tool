import type { TDocumentDefinitions, Content, ContentTable } from 'pdfmake/interfaces'

interface PdfPrinterConstructor {
  new(fonts: Record<string, { normal: string, bold: string, italics: string, bolditalics: string }>): PdfPrinterInstance
}

interface PdfPrinterInstance {
  createPdfKitDocument(docDefinition: TDocumentDefinitions): Promise<NodeJS.ReadWriteStream>
}

// pdfmake 0.3 has double-wrapped __esModule default export
async function getPdfPrinter(): Promise<PdfPrinterConstructor> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore pdfmake has no declaration for this subpath
  const mod: Record<string, unknown> = await import('pdfmake/js/Printer.js')
  const resolved = (mod.default as Record<string, unknown>)?.default || mod.default || mod
  return resolved as PdfPrinterConstructor
}

const fonts = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
}

const TEXT_DARK = '#111827'
const TEXT_MUTED = '#6b7280'
const BORDER_LIGHT = '#e5e7eb'

interface InvoiceData {
  invoiceNumber: string
  issueDate: string | null
  dueDate: string | null
  serviceDateFrom: string | null
  serviceDateTo: string | null
  reverseCharge: boolean
  paymentTerms: string | null
  notes: string | null
  netTotal: string | null
  vatTotal: string | null
  grossTotal: string | null
  client: {
    name: string
    street: string | null
    city: string | null
    zip: string | null
    country: string | null
    taxId: string | null
  }
  items: {
    description: string
    quantity: string | null
    unitPrice: string | null
    vatRate: string | null
    lineTotal: string | null
    sortOrder: number | null
  }[]
  business: {
    companyName: string | null
    street: string | null
    city: string | null
    zip: string | null
    country: string | null
    email: string | null
    phone: string | null
    taxId: string | null
    vatId: string | null
    iban: string | null
    bic: string | null
    bankName: string | null
  } | null
}

function fmt(value: string | null): string {
  const num = parseFloat(value || '0')
  return num.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function fmtDate(value: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('de-AT')
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  const PdfPrinter = await getPdfPrinter()
  const printer = new PdfPrinter(fonts)

  const biz = data.business

  // ── Recipient block ───────────────────────────────────────────────
  const clientLines: string[] = [data.client.name]
  if (data.client.street) clientLines.push(data.client.street)
  if (data.client.zip || data.client.city) clientLines.push([data.client.zip, data.client.city].filter(Boolean).join(' '))
  if (data.client.country && data.client.country !== 'AT') clientLines.push(data.client.country)
  if (data.client.taxId) clientLines.push(`UID: ${data.client.taxId}`)

  // ── Company detail lines (right column) ───────────────────────────
  const companyDetails: Content[] = []
  if (biz?.companyName) companyDetails.push({ text: biz.companyName, bold: true, fontSize: 10, color: TEXT_DARK, margin: [0, 0, 0, 3] })
  if (biz?.street) companyDetails.push({ text: biz.street, fontSize: 8, color: TEXT_MUTED })
  if (biz?.zip || biz?.city) companyDetails.push({ text: [biz.zip, biz.city].filter(Boolean).join(' '), fontSize: 8, color: TEXT_MUTED })
  if (biz?.phone) companyDetails.push({ text: biz.phone, fontSize: 8, color: TEXT_MUTED, margin: [0, 4, 0, 0] })
  if (biz?.email) companyDetails.push({ text: biz.email, fontSize: 8, color: TEXT_MUTED })
  if (biz?.vatId) companyDetails.push({ text: `UID: ${biz.vatId}`, fontSize: 8, color: TEXT_MUTED, margin: [0, 4, 0, 0] })
  if (biz?.taxId) companyDetails.push({ text: `Steuernr.: ${biz.taxId}`, fontSize: 8, color: TEXT_MUTED })

  // ── VAT by rate ───────────────────────────────────────────────────
  const vatByRate: Record<string, number> = {}
  for (const item of data.items) {
    const rate = item.vatRate || '0'
    const qty = parseFloat(item.quantity || '0')
    const price = parseFloat(item.unitPrice || '0')
    const vat = qty * price * (parseFloat(rate) / 100)
    vatByRate[rate] = (vatByRate[rate] || 0) + vat
  }

  // ── Items table ───────────────────────────────────────────────────
  const R = 'right' as const
  const tableHeader = [
    { text: 'Pos.', style: 'thLeft' },
    { text: 'Beschreibung', style: 'thLeft' },
    { text: 'Menge', style: 'thRight' },
    { text: 'Einzelpreis', style: 'thRight' },
    { text: 'USt', style: 'thRight' },
    { text: 'Gesamt', style: 'thRight' }
  ]

  const tableRows = data.items.map((item, idx) => [
    { text: String(idx + 1), fontSize: 9, color: TEXT_MUTED },
    { text: item.description, fontSize: 9 },
    { text: parseFloat(item.quantity || '0').toFixed(2), alignment: R, fontSize: 9 },
    { text: fmt(item.unitPrice), alignment: R, fontSize: 9 },
    { text: `${parseFloat(item.vatRate || '0')}%`, alignment: R, fontSize: 9, color: TEXT_MUTED },
    { text: fmt(item.lineTotal), alignment: R, fontSize: 9, bold: true }
  ])

  // ── Summary rows ──────────────────────────────────────────────────
  const summaryBody: Content[][] = [
    [
      { text: 'Nettobetrag', fontSize: 9, color: TEXT_MUTED },
      { text: fmt(data.netTotal), fontSize: 9, alignment: R }
    ],
    ...Object.entries(vatByRate).map(([rate, amount]) => [
      { text: `USt ${parseFloat(rate)}%`, fontSize: 9, color: TEXT_MUTED } as Content,
      { text: fmt(String(amount.toFixed(2))), fontSize: 9, alignment: R } as Content
    ]),
    [
      { text: 'Rechnungsbetrag', fontSize: 11, bold: true, color: TEXT_DARK, margin: [0, 4, 0, 0] },
      { text: fmt(data.grossTotal), fontSize: 11, bold: true, alignment: R, color: TEXT_DARK, margin: [0, 4, 0, 0] }
    ]
  ]

  // ── Reverse Charge notice ─────────────────────────────────────────
  const reverseChargeContent: Content[] = data.reverseCharge
    ? [{ text: 'Steuerschuldnerschaft des Leistungsempfängers gemäß Art. 196 der Richtlinie 2006/112/EG.\nEs wird keine Umsatzsteuer berechnet.', fontSize: 8, color: TEXT_MUTED, lineHeight: 1.5, margin: [0, 40, 0, 0] } as Content]
    : []

  // ── Footer content (bank + payment terms + notes) ────────────────
  const footerColumns: Content[] = []

  if (biz?.iban || biz?.bic || biz?.bankName) {
    const bankLines: Content[] = [
      { text: 'Bankverbindung', fontSize: 8, bold: true, color: TEXT_DARK, margin: [0, 0, 0, 3] }
    ]
    if (biz.bankName) bankLines.push({ text: biz.bankName, fontSize: 8, color: TEXT_MUTED })
    if (biz.iban) bankLines.push({ text: `IBAN: ${biz.iban}`, fontSize: 8, color: TEXT_MUTED })
    if (biz.bic) bankLines.push({ text: `BIC: ${biz.bic}`, fontSize: 8, color: TEXT_MUTED })
    footerColumns.push({ stack: bankLines, width: '*' } as Content)
  }

  if (data.paymentTerms) {
    footerColumns.push({
      stack: [
        { text: 'Zahlungsbedingungen', fontSize: 8, bold: true, color: TEXT_DARK, margin: [0, 0, 0, 3] } as Content,
        { text: data.paymentTerms, fontSize: 8, color: TEXT_MUTED } as Content
      ],
      width: '*'
    } as Content)
  }

  // ── Notes (in content, not footer) ──────────────────────────────
  const notesContent: Content[] = data.notes
    ? [
        { text: 'Anmerkungen', fontSize: 8, bold: true, color: TEXT_DARK, margin: [0, 20, 0, 3] } as Content,
        { text: data.notes, fontSize: 8, color: TEXT_MUTED } as Content
      ]
    : []

  // ── Meta info table (right-aligned) ───────────────────────────────
  const metaBody: Content[][] = [
    [{ text: 'Rechnungsnr.', style: 'metaLabel' }, { text: data.invoiceNumber, style: 'metaValue' }],
    [{ text: 'Rechnungsdatum', style: 'metaLabel' }, { text: fmtDate(data.issueDate), style: 'metaValue' }],
    [{ text: 'Leistungszeitraum', style: 'metaLabel' }, {
      text: data.serviceDateFrom && data.serviceDateTo
        ? `${fmtDate(data.serviceDateFrom)} – ${fmtDate(data.serviceDateTo)}`
        : fmtDate(data.serviceDateFrom || data.serviceDateTo),
      style: 'metaValue'
    }],
    [{ text: 'Fälligkeitsdatum', style: 'metaLabel' }, { text: fmtDate(data.dueDate), style: 'metaValue' }]
  ]

  // ── Document ──────────────────────────────────────────────────────
  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [50, 55, 50, footerColumns.length > 0 ? 110 : 40],
    footer: (currentPage: number, pageCount: number) => {
      const pageNum = { text: `Seite ${currentPage} von ${pageCount}`, alignment: 'center' as const, fontSize: 7, color: TEXT_MUTED, margin: [0, 5, 0, 0] as [number, number, number, number] }
      if (footerColumns.length === 0) return { stack: [pageNum], margin: [50, 10, 50, 0] as [number, number, number, number] }
      return {
        stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 0.5, lineColor: BORDER_LIGHT }], margin: [0, 0, 0, 12] as [number, number, number, number] },
          { columns: footerColumns, columnGap: 30 },
          pageNum
        ],
        margin: [50, 0, 50, 0] as [number, number, number, number]
      }
    },
    defaultStyle: {
      font: 'Helvetica',
      fontSize: 9,
      color: TEXT_DARK,
      lineHeight: 1.35
    },
    content: [
      // ── Header: recipient left, company right ──
      {
        columns: [
          {
            width: '55%',
            stack: clientLines.map(line => ({ text: line, fontSize: 10, lineHeight: 1.4 }))
          },
          {
            width: '45%',
            stack: companyDetails,
            alignment: 'right' as const
          }
        ],
        margin: [0, 0, 0, 40]
      },

      // ── Invoice title + meta ──
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'RECHNUNG', fontSize: 22, bold: true, color: TEXT_DARK },
              { text: data.invoiceNumber, fontSize: 11, color: TEXT_MUTED, margin: [0, 2, 0, 0] }
            ]
          },
          {
            width: 'auto',
            table: {
              body: metaBody
            },
            layout: 'noBorders'
          }
        ],
        margin: [0, 0, 0, 35]
      },

      // ── Items table ──
      {
        table: {
          headerRows: 1,
          widths: [28, '*', 45, 70, 35, 70],
          body: [tableHeader, ...tableRows]
        },
        layout: {
          hLineWidth: (i: number, node: { table: { body: unknown[] } }) => {
            if (i === 0) return 0
            if (i === 1) return 1.5
            if (i === node.table.body.length) return 1.5
            return 0.5
          },
          vLineWidth: () => 0,
          hLineColor: () => BORDER_LIGHT,
          paddingTop: () => 7,
          paddingBottom: () => 7,
          paddingLeft: (i: number) => i === 0 ? 0 : 8,
          paddingRight: (i: number, node: ContentTable) => {
            const widths = node.table.widths
            return Array.isArray(widths) && i === widths.length - 1 ? 0 : 8
          }
        }
      },

      // ── Totals + Reverse Charge + Notes (keep together) ──
      {
        unbreakable: true,
        stack: [
          {
            columns: [
              { width: '*', text: '' },
              {
                width: 220,
                table: { widths: ['*', 'auto'], body: summaryBody },
                layout: {
                  hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
                    i === node.table.body.length - 1 ? 1 : 0,
                  vLineWidth: () => 0,
                  hLineColor: () => BORDER_LIGHT,
                  paddingTop: () => 4,
                  paddingBottom: () => 4,
                  paddingLeft: () => 0,
                  paddingRight: () => 0
                }
              }
            ],
            margin: [0, 15, 0, 0]
          },
          ...reverseChargeContent,
          ...notesContent
        ]
      }
    ],
    styles: {
      thLeft: { fontSize: 8, bold: true, color: TEXT_MUTED },
      thRight: { fontSize: 8, bold: true, color: TEXT_MUTED, alignment: 'right' },
      metaLabel: { fontSize: 8, color: TEXT_MUTED },
      metaValue: { fontSize: 9, bold: true, alignment: 'right' }
    }
  }

  const doc = await printer.createPdfKitDocument(docDefinition)
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.end()
  })
}
