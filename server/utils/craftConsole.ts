import { sql } from 'drizzle-orm'
import { pluginSales } from '~~/server/db/schema'

const BASE_URL = 'https://console.craftcms.com'

function extractCsrfToken(body: string): string | null {
  const match = body.match(/csrfTokenValue:\s*"([\s\S]*?)"/)
  if (!match?.[1]) return null
  // JSON-decode to handle escaped unicode (e.g. \u003D -> =)
  try {
    return JSON.parse(`"${match[1]}"`)
  } catch {
    return match[1]
  }
}

function mergeCookies(existing: string, headers: Headers): string {
  const newCookies = headers.getSetCookie()
    .map(c => c.split(';')[0])
  if (!newCookies.length) return existing

  const cookieMap = new Map<string, string>()
  for (const c of existing.split('; ').filter(Boolean)) {
    const [name, ...rest] = c.split('=')
    if (name) cookieMap.set(name, rest.join('='))
  }
  for (const c of newCookies) {
    if (!c) continue
    const [name, ...rest] = c.split('=')
    if (name) cookieMap.set(name, rest.join('='))
  }

  return [...cookieMap.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
}

interface CraftSession {
  cookies: string
  headers: Record<string, string>
}

async function login(): Promise<CraftSession> {
  const config = useRuntimeConfig()
  const email = config.craftConsoleEmail
  const password = config.craftConsolePassword

  if (!email || !password) {
    throw new Error('Craft Console credentials not configured')
  }

  // Step 1: GET login page for CSRF token and cookies
  const loginPageRes = await fetch(`${BASE_URL}/login`)
  const body = await loginPageRes.text()
  const csrfToken = extractCsrfToken(body)
  if (!csrfToken) {
    throw new Error('Could not extract CSRF token from login page')
  }
  let cookies = mergeCookies('', loginPageRes.headers)

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'X-CSRF-Token': csrfToken
  }

  // Step 2: POST login as multipart form data (matching Guzzle multipart)
  const formData = new FormData()
  formData.append('loginName', email)
  formData.append('password', password)

  const loginRes = await fetch(`${BASE_URL}/index.php?p=actions/users/login`, {
    method: 'POST',
    headers: {
      ...headers,
      'Cookie': cookies
    },
    body: formData,
    redirect: 'manual'
  })

  cookies = mergeCookies(cookies, loginRes.headers)

  return { cookies, headers }
}

async function getOrgId(session: CraftSession): Promise<string> {
  const config = useRuntimeConfig()
  if (config.craftConsoleOrgId) {
    return config.craftConsoleOrgId
  }

  const res = await fetch(`${BASE_URL}/orgs`, {
    headers: {
      ...session.headers,
      'Cookie': session.cookies
    }
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch orgs: ${res.status}`)
  }

  const data = await res.json() as { orgs: { id: number }[] }
  const orgId = data.orgs?.[0]?.id
  if (!orgId) {
    throw new Error('No organization found')
  }
  return String(orgId)
}

interface CraftSale {
  id: number
  plugin: { id: number, name: string, hasMultipleEditions: boolean }
  edition: { handle: string }
  purchasableType: string
  grossAmount: number
  netAmount: number
  customer: { ownerReference: string }
  saleTime: string
}

interface SalesResponse {
  total: number
  data: CraftSale[]
}

async function fetchSalesPage(session: CraftSession, orgId: string, page: number, limit: number): Promise<SalesResponse> {
  const url = `${BASE_URL}/index.php?p=actions/craftnet/console/sales/get-sales&orgId=${orgId}&page=${page}&limit=${limit}`

  const res = await fetch(url, {
    headers: {
      ...session.headers,
      'Cookie': session.cookies
    }
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to fetch sales page ${page}: ${res.status} - ${text.substring(0, 200)}`)
  }

  return await res.json() as SalesResponse
}

// Cache exchange rates per date to avoid redundant API calls
async function getExchangeRate(date: string, rateCache: Map<string, number>): Promise<number> {
  if (rateCache.has(date)) {
    return rateCache.get(date)!
  }

  // Try specific date first, fall back to latest if unavailable (weekends, holidays, recent dates)
  let res = await fetch(`https://api.frankfurter.app/${date}?from=USD&to=EUR`)
  if (!res.ok) {
    res = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR')
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch exchange rate: ${res.status}`)
  }
  const data = await res.json() as { rates: { EUR: number } }
  const rate = data.rates.EUR
  rateCache.set(date, rate)
  return rate
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]!
}

export async function syncPluginSales(): Promise<{ synced: number }> {
  const session = await login()
  const orgId = await getOrgId(session)

  // Get total from API and compare with stored count
  const initial = await fetchSalesPage(session, orgId, 1, 3)
  const total = initial.total
  const [stored] = await db.select({ count: sql<number>`count(*)` }).from(pluginSales)
  const storedCount = Number(stored?.count ?? 0)

  if (total <= storedCount) {
    return { synced: 0 }
  }

  // Only fetch new sales (API returns newest first)
  const amount = total - storedCount
  const limit = 100
  const pages = Math.ceil(amount / limit)
  const rateCache = new Map<string, number>()
  let totalSynced = 0

  for (let page = 1; page <= pages; page++) {
    const pageLimit = pages === 1 ? amount : limit
    const data = await fetchSalesPage(session, orgId, page, pageLimit)

    if (data.data.length > 0) {
      const dates = new Set(data.data.map(s => toDateString(new Date(s.saleTime))))
      for (const date of dates) {
        await getExchangeRate(date, rateCache)
      }

      const values = data.data.map((sale) => {
        const saleDate = new Date(sale.saleTime)
        const dateStr = toDateString(saleDate)
        const rate = rateCache.get(dateStr)!

        return {
          saleId: sale.id,
          pluginName: sale.plugin.name,
          edition: sale.edition.handle,
          renewal: sale.purchasableType === 'craftnet\\plugins\\PluginRenewal' ? 1 : 0,
          grossAmount: String(sale.grossAmount),
          netAmount: String(sale.netAmount),
          grossAmountEur: (sale.grossAmount * rate).toFixed(2),
          netAmountEur: (sale.netAmount * rate).toFixed(2),
          exchangeRate: String(rate),
          customer: sale.customer?.ownerReference || null,
          dateSold: saleDate
        }
      })

      await db
        .insert(pluginSales)
        .values(values)
        .onConflictDoNothing()

      totalSynced += values.length
    }
  }

  return { synced: totalSynced }
}
