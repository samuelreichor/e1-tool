import { google, type drive_v3 } from 'googleapis'
import { Readable } from 'node:stream'

let driveClient: drive_v3.Drive | null = null

function getDriveClient() {
  if (!driveClient) {
    const config = useRuntimeConfig()
    const oauth2Client = new google.auth.OAuth2(
      config.googleClientId,
      config.googleClientSecret
    )
    oauth2Client.setCredentials({ refresh_token: config.googleRefreshToken })
    driveClient = google.drive({ version: 'v3', auth: oauth2Client })
  }
  return driveClient
}

async function findOrCreateFolder(drive: drive_v3.Drive, name: string, parentId: string) {
  const query = `name = '${name}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  const res = await drive.files.list({ q: query, fields: 'files(id)' })
  const existingId = res.data.files?.[0]?.id
  if (existingId) {
    return existingId
  }

  const created = await drive.files.create({
    requestBody: {
      name,
      parents: [parentId],
      mimeType: 'application/vnd.google-apps.folder'
    },
    fields: 'id'
  })

  return created.data.id!
}

async function uploadToDrive({ buffer, fileName, year, folderName, mimeType }: {
  buffer: Buffer
  fileName: string
  year: string
  folderName: string
  mimeType: string
}) {
  const config = useRuntimeConfig()
  const drive = getDriveClient()

  const yearFolderId = await findOrCreateFolder(drive, year, config.googleDriveFolderId)
  const targetFolderId = await findOrCreateFolder(drive, folderName, yearFolderId)

  const existing = await drive.files.list({
    q: `name = '${fileName}' and '${targetFolderId}' in parents and trashed = false`,
    fields: 'files(id)'
  })

  const media = {
    mimeType,
    body: Readable.from(buffer)
  }

  const existingFileId = existing.data.files?.[0]?.id
  if (existingFileId) {
    const response = await drive.files.update({
      fileId: existingFileId,
      media,
      fields: 'id,name'
    })
    return response.data
  }

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [targetFolderId]
    },
    media,
    fields: 'id,name'
  })

  return response.data
}

export async function uploadPdfToDrive({ buffer, fileName, issueDate }: {
  buffer: Buffer
  fileName: string
  issueDate: string
}) {
  return uploadToDrive({
    buffer,
    fileName,
    year: new Date(issueDate).getFullYear().toString(),
    folderName: '02-rechnungen',
    mimeType: 'application/pdf'
  })
}

export async function uploadExcelToDrive({ buffer, fileName, year }: {
  buffer: Buffer
  fileName: string
  year: string
}) {
  return uploadToDrive({
    buffer,
    fileName,
    year,
    folderName: '03-ea-rechnung',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
}
