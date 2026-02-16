import { sql, eq, desc } from 'drizzle-orm'
import { invoices, clients, pluginSales } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear

  const cmStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
  const pmStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`
  const ytdStart = `${currentYear}-01-01`

  // Invoice aggregates helper
  async function invoiceAgg(dateFrom: string, dateTo?: string) {
    const dateCondition = dateTo
      ? sql`${invoices.issueDate} >= ${dateFrom} AND ${invoices.issueDate} < ${dateTo}`
      : sql`${invoices.issueDate} >= ${dateFrom}`

    const [row] = await db
      .select({
        netTotal: sql<string>`COALESCE(SUM(${invoices.netTotal}), 0)`,
        grossTotal: sql<string>`COALESCE(SUM(${invoices.grossTotal}), 0)`,
        count: sql<number>`COUNT(*)::int`
      })
      .from(invoices)
      .where(sql`${invoices.status} IN ('paid', 'sent', 'overdue') AND ${dateCondition}`)

    return {
      net: parseFloat(row!.netTotal),
      gross: parseFloat(row!.grossTotal),
      count: row!.count
    }
  }

  // Plugin sales aggregates helper
  async function pluginAgg(dateFrom: string, dateTo?: string) {
    const dateCondition = dateTo
      ? sql`${pluginSales.dateSold} >= ${dateFrom}::timestamp AND ${pluginSales.dateSold} < ${dateTo}::timestamp`
      : sql`${pluginSales.dateSold} >= ${dateFrom}::timestamp`

    const [row] = await db
      .select({
        netTotal: sql<string>`COALESCE(SUM(${pluginSales.netAmountEur}), 0)`,
        count: sql<number>`COUNT(*)::int`
      })
      .from(pluginSales)
      .where(dateCondition)

    return {
      net: parseFloat(row!.netTotal),
      count: row!.count
    }
  }

  // Next month start for date range boundaries
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
  const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear
  const nmStart = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`

  // Run all aggregates in parallel
  const [
    invCurrent, invPrev, invYtd,
    plgCurrent, plgPrev, plgYtd,
    invoiceTrend, pluginTrend,
    recentInvoices, recentPluginSales,
    openInvoices
  ] = await Promise.all([
    // Invoice aggregates
    invoiceAgg(cmStart, nmStart),
    invoiceAgg(pmStart, cmStart),
    invoiceAgg(ytdStart),
    // Plugin sales aggregates
    pluginAgg(cmStart, nmStart),
    pluginAgg(pmStart, cmStart),
    pluginAgg(ytdStart),

    // 12-month invoice trend
    db.select({
      month: sql<string>`TO_CHAR(${invoices.issueDate}, 'YYYY-MM')`,
      net: sql<string>`COALESCE(SUM(${invoices.netTotal}), 0)`
    })
      .from(invoices)
      .where(sql`${invoices.status} IN ('paid', 'sent', 'overdue') AND ${invoices.issueDate} >= (CURRENT_DATE - INTERVAL '11 months')::date`)
      .groupBy(sql`TO_CHAR(${invoices.issueDate}, 'YYYY-MM')`),

    // 12-month plugin sales trend
    db.select({
      month: sql<string>`TO_CHAR(${pluginSales.dateSold}, 'YYYY-MM')`,
      net: sql<string>`COALESCE(SUM(${pluginSales.netAmountEur}), 0)`
    })
      .from(pluginSales)
      .where(sql`${pluginSales.dateSold} >= (CURRENT_DATE - INTERVAL '11 months')`)
      .groupBy(sql`TO_CHAR(${pluginSales.dateSold}, 'YYYY-MM')`),

    // Recent 5 invoices
    db.select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      clientName: clients.name,
      grossTotal: invoices.grossTotal,
      status: invoices.status,
      issueDate: invoices.issueDate
    })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .orderBy(desc(invoices.createdAt))
      .limit(5),

    // Recent 5 plugin sales
    db.select({
      id: pluginSales.id,
      pluginName: pluginSales.pluginName,
      edition: pluginSales.edition,
      renewal: pluginSales.renewal,
      netAmountEur: pluginSales.netAmountEur,
      dateSold: sql<string>`${pluginSales.dateSold}::text`
    })
      .from(pluginSales)
      .orderBy(desc(pluginSales.dateSold))
      .limit(5),

    // Open invoices
    db.select({
      total: sql<string>`COALESCE(SUM(${invoices.grossTotal}), 0)`,
      count: sql<number>`COUNT(*)::int`
    })
      .from(invoices)
      .where(sql`${invoices.status} IN ('sent', 'overdue')`)
  ])

  // Build current/prev month results
  const currentMonthData = {
    invoicesNet: invCurrent.net,
    invoicesGross: invCurrent.gross,
    pluginSalesNet: plgCurrent.net,
    totalNet: invCurrent.net + plgCurrent.net,
    invoiceCount: invCurrent.count,
    pluginSaleCount: plgCurrent.count
  }

  const previousMonthData = {
    invoicesNet: invPrev.net,
    invoicesGross: invPrev.gross,
    pluginSalesNet: plgPrev.net,
    totalNet: invPrev.net + plgPrev.net,
    invoiceCount: invPrev.count,
    pluginSaleCount: plgPrev.count
  }

  const yearToDateData = {
    invoicesNet: invYtd.net,
    invoicesGross: invYtd.gross,
    pluginSalesNet: plgYtd.net,
    totalNet: invYtd.net + plgYtd.net,
    invoiceCount: invYtd.count,
    pluginSaleCount: plgYtd.count
  }

  // Change percent
  const changePercent = previousMonthData.totalNet > 0
    ? Math.round((currentMonthData.totalNet - previousMonthData.totalNet) / previousMonthData.totalNet * 1000) / 10
    : null

  // Build 12-month trend with gap-filling
  const invoiceMap = new Map(invoiceTrend.map(r => [r.month, parseFloat(r.net)]))
  const pluginMap = new Map(pluginTrend.map(r => [r.month, parseFloat(r.net)]))

  const trend: { month: string, label: string, invoicesNet: number, pluginSalesNet: number, totalNet: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - 1 - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('de-AT', { month: 'short', year: '2-digit' })
    const invNet = invoiceMap.get(key) || 0
    const plgNet = pluginMap.get(key) || 0
    trend.push({
      month: key,
      label,
      invoicesNet: invNet,
      pluginSalesNet: plgNet,
      totalNet: invNet + plgNet
    })
  }

  const openRow = openInvoices[0]!

  return {
    currentMonth: currentMonthData,
    previousMonth: previousMonthData,
    yearToDate: yearToDateData,
    changePercent,
    trend,
    recentInvoices,
    recentPluginSales,
    openInvoicesTotal: parseFloat(openRow.total),
    openInvoicesCount: openRow.count
  }
})
