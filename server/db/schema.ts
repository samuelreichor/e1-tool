import { relations } from 'drizzle-orm'
import { pgTable, serial, text, integer, numeric, date, timestamp, unique } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  githubId: integer('github_id').notNull().unique(),
  name: text('name').notNull(),
  email: text('email'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  street: text('street'),
  city: text('city'),
  zip: text('zip'),
  country: text('country').default('AT'),
  taxId: text('tax_id'),
  hourlyRate: numeric('hourly_rate', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  clientId: integer('client_id').notNull().references(() => clients.id),
  status: text('status').default('draft').notNull(),
  issueDate: date('issue_date'),
  dueDate: date('due_date'),
  serviceDateFrom: date('service_date_from'),
  serviceDateTo: date('service_date_to'),
  reverseCharge: integer('reverse_charge').default(0).notNull(),
  paymentTerms: text('payment_terms'),
  notes: text('notes'),
  netTotal: numeric('net_total', { precision: 12, scale: 2 }),
  vatTotal: numeric('vat_total', { precision: 12, scale: 2 }),
  grossTotal: numeric('gross_total', { precision: 12, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

export const invoiceItems = pgTable('invoice_items', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 2 }),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }),
  vatRate: numeric('vat_rate', { precision: 5, scale: 2 }),
  lineTotal: numeric('line_total', { precision: 12, scale: 2 }),
  sortOrder: integer('sort_order')
})

export const emailLogs = pgTable('email_logs', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  recipient: text('recipient').notNull(),
  subject: text('subject').notNull(),
  templateKey: text('template_key'),
  status: text('status').notNull(), // 'sent' | 'failed'
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at').defaultNow().notNull()
})

export const businessSettings = pgTable('business_settings', {
  id: serial('id').primaryKey(),
  companyName: text('company_name'),
  street: text('street'),
  city: text('city'),
  zip: text('zip'),
  country: text('country'),
  email: text('email'),
  phone: text('phone'),
  taxId: text('tax_id'),
  vatId: text('vat_id'),
  iban: text('iban'),
  bic: text('bic'),
  bankName: text('bank_name'),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

export const pluginSales = pgTable('plugin_sales', {
  id: serial('id').primaryKey(),
  saleId: integer('sale_id').notNull().unique(),
  pluginName: text('plugin_name').notNull(),
  edition: text('edition').notNull(),
  renewal: integer('renewal').default(0).notNull(),
  grossAmount: numeric('gross_amount', { precision: 12, scale: 2 }),
  netAmount: numeric('net_amount', { precision: 12, scale: 2 }),
  grossAmountEur: numeric('gross_amount_eur', { precision: 12, scale: 2 }),
  netAmountEur: numeric('net_amount_eur', { precision: 12, scale: 2 }),
  exchangeRate: numeric('exchange_rate', { precision: 10, scale: 6 }),
  customer: text('customer'),
  dateSold: timestamp('date_sold'),
  createdAt: timestamp('created_at').defaultNow().notNull()
})

export const ibanCategories = pgTable('iban_categories', {
  id: serial('id').primaryKey(),
  iban: text('iban').notNull().unique(),
  name: text('name').notNull(),
  excluded: integer('excluded').default(0).notNull(),
  matchType: text('match_type').default('iban').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
})

export const receipts = pgTable('receipts', {
  id: serial('id').primaryKey(),
  bookingDate: date('booking_date').notNull(),
  valueDate: date('value_date'),
  partnerName: text('partner_name'),
  partnerIban: text('partner_iban'),
  type: text('type'),
  paymentReference: text('payment_reference'),
  amountEur: numeric('amount_eur', { precision: 12, scale: 2 }).notNull(),
  originalAmount: numeric('original_amount', { precision: 12, scale: 2 }),
  originalCurrency: text('original_currency'),
  exchangeRate: numeric('exchange_rate', { precision: 10, scale: 6 }),
  category: text('category').default('Sonstige').notNull(),
  excluded: integer('excluded').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => [
  unique().on(table.bookingDate, table.partnerName, table.amountEur, table.paymentReference).nullsNotDistinct()
])

// Relations
export const clientsRelations = relations(clients, ({ many }) => ({
  invoices: many(invoices)
}))

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id]
  }),
  items: many(invoiceItems),
  emailLogs: many(emailLogs)
}))

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id]
  })
}))

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  invoice: one(invoices, {
    fields: [emailLogs.invoiceId],
    references: [invoices.id]
  })
}))
