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

  interface PluginSale {
    id: number
    saleId: number
    pluginName: string
    edition: string
    renewal: number
    grossAmount: string | null
    netAmount: string | null
    grossAmountEur: string | null
    netAmountEur: string | null
    exchangeRate: string | null
    customer: string | null
    dateSold: string | null
  }

  interface LineItem {
    description: string
    quantity: number
    unitPrice: number
    vatRate: number
  }

  interface DashboardMonthlyRevenue {
    invoicesNet: number
    invoicesGross: number
    pluginSalesNet: number
    totalNet: number
    invoiceCount: number
    pluginSaleCount: number
  }

  interface DashboardMonthTrend {
    month: string
    label: string
    invoicesNet: number
    pluginSalesNet: number
    totalNet: number
  }

  interface DashboardRecentInvoice {
    id: number
    invoiceNumber: string
    clientName: string | null
    grossTotal: string | null
    status: string
    issueDate: string | null
  }

  interface DashboardRecentPluginSale {
    id: number
    pluginName: string
    edition: string
    renewal: number
    netAmountEur: string | null
    dateSold: string | null
  }

  interface DashboardStats {
    currentMonth: DashboardMonthlyRevenue
    previousMonth: DashboardMonthlyRevenue
    yearToDate: DashboardMonthlyRevenue
    changePercent: number | null
    trend: DashboardMonthTrend[]
    recentInvoices: DashboardRecentInvoice[]
    recentPluginSales: DashboardRecentPluginSale[]
    openInvoicesTotal: number
    openInvoicesCount: number
  }
}

export {}
