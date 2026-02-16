export const emailTemplates = [
  { key: 'friendly', label: 'Freundlich' },
  { key: 'formal', label: 'Formell' },
  { key: 'reminder', label: 'Zahlungserinnerung' }
] as const

export type EmailTemplateKey = typeof emailTemplates[number]['key']

function formatMonth(issueDate: string | null) {
  if (!issueDate) return ''
  return new Date(issueDate).toLocaleDateString('de-AT', { month: 'long', year: 'numeric' })
}

export function getEmailBody(template: EmailTemplateKey, data: {
  invoiceNumber: string
  companyName: string | null
  issueDate: string | null
}) {
  const company = data.companyName || 'Uns'
  const month = formatMonth(data.issueDate)

  switch (template) {
    case 'formal':
      return `Sehr geehrte Damen und Herren,

anbei erhalten Sie die Rechnung ${data.invoiceNumber}${month ? ` vom ${month}` : ''}.

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
${company}`

    case 'friendly':
      return `Hallo,

im Anhang findest du die Rechnung ${data.invoiceNumber}${month ? ` vom ${month}` : ''}.

Bei Fragen melde dich gerne!

Beste Grüße
${company}`

    case 'reminder':
      return `Hallo,

kurze Erinnerung: die Rechnung ${data.invoiceNumber}${month ? ` vom ${month}` : ''} ist noch offen.

Wäre super, wenn du den Betrag bei Gelegenheit überweisen könntest. Falls die Zahlung schon raus ist, kannst du diese Nachricht einfach ignorieren.

Beste Grüße
${company}`
  }
}

export function wrapInHtml(plainText: string) {
  const escapedText = plainText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>${escapedText}</body>
</html>`
}
