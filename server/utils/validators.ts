import { z } from 'zod'

export const clientSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  email: z.string().email('Ungültige E-Mail').optional().or(z.literal('')),
  street: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  taxId: z.string().optional(),
  hourlyRate: z.coerce.number().min(0).optional().or(z.literal(''))
})

export const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Beschreibung ist erforderlich'),
  quantity: z.coerce.number().positive('Menge muss positiv sein'),
  unitPrice: z.coerce.number().min(0, 'Preis darf nicht negativ sein'),
  vatRate: z.coerce.number().refine(v => v === 20 || v === 10 || v === 0, {
    message: 'USt-Satz muss 0, 10 oder 20 sein'
  }),
  sortOrder: z.coerce.number().int().optional()
})

export const invoiceSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  serviceDateFrom: z.string().optional(),
  serviceDateTo: z.string().optional(),
  reverseCharge: z.boolean().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'Mindestens eine Position erforderlich')
})

export const invoiceStatusSchema = z.object({
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled'])
})

export const sendInvoiceEmailSchema = z.object({
  recipient: z.string().email('Ungültige E-Mail-Adresse'),
  subject: z.string().min(1, 'Betreff ist erforderlich'),
  body: z.string().min(1, 'Nachricht ist erforderlich'),
  templateKey: z.string().optional()
})

export const businessSettingsSchema = z.object({
  companyName: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  taxId: z.string().optional(),
  vatId: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  bankName: z.string().optional()
})
