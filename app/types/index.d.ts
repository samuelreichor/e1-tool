declare module '#auth-utils' {
  interface User {
    githubId: number
    name: string
    email: string | null
    avatarUrl: string | null
  }
}

declare global {
  interface AppClient {
    id: number
    name: string
    email: string | null
    street: string | null
    city: string | null
    zip: string | null
    country: string | null
    taxId: string | null
    hourlyRate: string | null
    createdAt: string
    updatedAt: string
  }

  interface Invoice {
    id: number
    invoiceNumber: string
    clientId: number
    status: string
    issueDate: string | null
    dueDate: string | null
    serviceDateFrom: string | null
    serviceDateTo: string | null
    reverseCharge: number
    paymentTerms: string | null
    notes: string | null
    netTotal: string | null
    vatTotal: string | null
    grossTotal: string | null
    createdAt: string
    updatedAt: string
  }

  interface InvoiceItem {
    id: number
    invoiceId: number
    description: string
    quantity: string | null
    unitPrice: string | null
    vatRate: string | null
    lineTotal: string | null
    sortOrder: number | null
  }

  interface InvoiceDetail extends Invoice {
    client?: AppClient
    items: InvoiceItem[]
  }

  interface InvoiceListItem {
    id: number
    invoiceNumber: string
    status: string
    issueDate: string | null
    dueDate: string | null
    netTotal: string | null
    grossTotal: string | null
    clientName: string | null
    clientId: number
  }

  interface EmailLog {
    id: number
    invoiceId: number
    recipient: string
    subject: string
    templateKey: string | null
    status: 'sent' | 'failed'
    errorMessage: string | null
    sentAt: string
  }

  interface LineItem {
    description: string
    quantity: number
    unitPrice: number
    vatRate: number
  }
}

export {}
