import nodemailer from 'nodemailer'
import type { Attachment } from 'nodemailer/lib/mailer'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!transporter) {
    const config = useRuntimeConfig()
    transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: Number(config.smtpPort),
      secure: false,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass
      }
    })
  }
  return transporter
}

export async function sendMail({ to, subject, html, attachments }: {
  to: string
  subject: string
  html: string
  attachments?: Attachment[]
}) {
  const config = useRuntimeConfig()
  return getTransporter().sendMail({
    from: config.smtpFrom,
    to,
    subject,
    html,
    attachments
  })
}
