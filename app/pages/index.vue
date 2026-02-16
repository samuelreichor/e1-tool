<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

useUserSession()

useDashboard()

const { data: stats, status: fetchStatus } = useLazyFetch<DashboardStats>('/api/dashboard/stats')

function formatCurrency(value: number | string | null) {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0)
  return num.toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('de-AT')
}

const chartData = computed(() => {
  if (!stats.value?.trend) return null
  return {
    labels: stats.value.trend.map(t => t.label),
    datasets: [
      {
        label: 'Rechnungen',
        data: stats.value.trend.map(t => t.invoicesNet),
        backgroundColor: 'rgb(34, 197, 94)',
        borderRadius: 3
      },
      {
        label: 'Plugin Sales',
        data: stats.value.trend.map(t => t.pluginSalesNet),
        backgroundColor: 'rgb(96, 165, 250)',
        borderRadius: 3
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      stacked: true,
      grid: { display: false },
      ticks: {
        font: { size: 10 },
        maxRotation: 45,
        minRotation: 0
      }
    },
    y: {
      stacked: true,
      grid: { color: 'rgba(128, 128, 128, 0.1)' },
      ticks: {
        font: { size: 10 },
        callback: (value: number | string) => {
          const num = typeof value === 'string' ? parseFloat(value) : value
          if (num >= 1000) return `${(num / 1000).toFixed(0)}k`
          return `${num}`
        }
      }
    }
  },
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        boxWidth: 12,
        boxHeight: 12,
        padding: 16,
        font: { size: 11 }
      }
    },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label?: string }, parsed: { y: number | null } }) => {
          const val = ctx.parsed.y ?? 0
          return `${ctx.dataset.label}: ${val.toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })}`
        }
      }
    }
  }
}
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Dashboard">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Loading -->
      <div v-if="fetchStatus === 'pending'" class="flex items-center justify-center min-h-48">
        <UIcon name="i-lucide-loader-circle" class="size-8 text-dimmed animate-spin" />
      </div>

      <!-- Error -->
      <div v-else-if="fetchStatus === 'error'" class="flex flex-col items-center justify-center min-h-48 gap-2">
        <UIcon name="i-lucide-alert-triangle" class="size-10 text-red-500" />
        <p class="text-dimmed">
          Dashboard konnte nicht geladen werden.
        </p>
      </div>

      <!-- Dashboard Content -->
      <div v-else-if="stats" class="flex flex-col gap-6 p-4 sm:p-6">
        <!-- KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Current Month -->
          <div class="rounded-lg border border-default bg-default p-4 flex flex-col gap-1">
            <span class="text-sm text-dimmed">Umsatz diesen Monat</span>
            <span class="text-2xl font-semibold tabular-nums">{{ formatCurrency(stats.currentMonth.totalNet) }}</span>
            <div v-if="stats.changePercent !== null" class="flex items-center gap-1 text-sm">
              <UIcon
                :name="stats.changePercent >= 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
                :class="stats.changePercent >= 0 ? 'text-green-500' : 'text-red-500'"
                class="size-4"
              />
              <span :class="stats.changePercent >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ stats.changePercent > 0 ? '+' : '' }}{{ stats.changePercent }}%
              </span>
              <span class="text-dimmed">vs. Vormonat</span>
            </div>
          </div>

          <!-- Previous Month -->
          <div class="rounded-lg border border-default bg-default p-4 flex flex-col gap-1">
            <span class="text-sm text-dimmed">Vormonat</span>
            <span class="text-2xl font-semibold tabular-nums">{{ formatCurrency(stats.previousMonth.totalNet) }}</span>
            <span class="text-sm text-dimmed">
              {{ stats.previousMonth.invoiceCount }} Rechnungen, {{ stats.previousMonth.pluginSaleCount }} Sales
            </span>
          </div>

          <!-- YTD -->
          <div class="rounded-lg border border-default bg-default p-4 flex flex-col gap-1">
            <span class="text-sm text-dimmed">Umsatz YTD</span>
            <span class="text-2xl font-semibold tabular-nums">{{ formatCurrency(stats.yearToDate.totalNet) }}</span>
            <span class="text-sm text-dimmed">
              {{ stats.yearToDate.invoiceCount }} Rechnungen, {{ stats.yearToDate.pluginSaleCount }} Sales
            </span>
          </div>

          <!-- Open Invoices -->
          <div class="rounded-lg border border-default bg-default p-4 flex flex-col gap-1">
            <span class="text-sm text-dimmed">Offene Rechnungen</span>
            <span class="text-2xl font-semibold tabular-nums">{{ formatCurrency(stats.openInvoicesTotal) }}</span>
            <span class="text-sm text-dimmed">
              {{ stats.openInvoicesCount }} {{ stats.openInvoicesCount === 1 ? 'Rechnung' : 'Rechnungen' }} offen
            </span>
          </div>
        </div>

        <!-- Revenue Trend -->
        <div class="rounded-lg border border-default bg-default p-4">
          <h3 class="text-sm font-medium mb-4">
            Umsatzentwicklung (12 Monate)
          </h3>
          <div class="h-48 sm:h-56">
            <Bar v-if="chartData" :data="chartData" :options="chartOptions" />
          </div>
        </div>

        <!-- Source Breakdown -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Invoices -->
          <div class="rounded-lg border border-default bg-default p-4 flex flex-col gap-2">
            <h3 class="text-sm font-medium">
              Rechnungen
            </h3>
            <div class="flex items-baseline justify-between">
              <span class="text-lg font-semibold tabular-nums">{{ formatCurrency(stats.currentMonth.invoicesNet) }}</span>
              <span class="text-sm text-dimmed">netto</span>
            </div>
            <div class="flex items-baseline justify-between text-sm text-dimmed">
              <span class="tabular-nums">{{ formatCurrency(stats.currentMonth.invoicesGross) }}</span>
              <span>brutto</span>
            </div>
            <span class="text-xs text-dimmed">{{ stats.currentMonth.invoiceCount }} Rechnungen diesen Monat</span>
          </div>

          <!-- Plugin Sales -->
          <div class="rounded-lg border border-default bg-default p-4 flex flex-col gap-2">
            <h3 class="text-sm font-medium">
              Plugin Sales
            </h3>
            <div class="flex items-baseline justify-between">
              <span class="text-lg font-semibold tabular-nums">{{ formatCurrency(stats.currentMonth.pluginSalesNet) }}</span>
              <span class="text-sm text-dimmed">netto</span>
            </div>
            <span class="text-xs text-dimmed">{{ stats.currentMonth.pluginSaleCount }} Sales diesen Monat</span>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Recent Invoices -->
          <div class="rounded-lg border border-default bg-default p-4 flex flex-col gap-3">
            <h3 class="text-sm font-medium">
              Letzte Rechnungen
            </h3>
            <div v-if="stats.recentInvoices.length === 0" class="text-sm text-dimmed">
              Keine Rechnungen vorhanden.
            </div>
            <NuxtLink
              v-for="inv in stats.recentInvoices"
              :key="inv.id"
              :to="`/invoices/${inv.id}`"
              class="flex items-center justify-between gap-2 py-1.5 -mx-1 px-1 rounded hover:bg-elevated transition-colors"
            >
              <div class="flex flex-col gap-0.5 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium truncate">{{ inv.invoiceNumber }}</span>
                  <InvoiceStatusBadge :status="inv.status" />
                </div>
                <span class="text-xs text-dimmed truncate">{{ inv.clientName || '-' }}</span>
              </div>
              <div class="flex flex-col items-end gap-0.5 shrink-0">
                <span class="text-sm tabular-nums">{{ formatCurrency(inv.grossTotal) }}</span>
                <span class="text-xs text-dimmed">{{ formatDate(inv.issueDate) }}</span>
              </div>
            </NuxtLink>
          </div>

          <!-- Recent Plugin Sales -->
          <div class="rounded-lg border border-default bg-default p-4 flex flex-col gap-3">
            <h3 class="text-sm font-medium">
              Letzte Plugin Sales
            </h3>
            <div v-if="stats.recentPluginSales.length === 0" class="text-sm text-dimmed">
              Keine Plugin Sales vorhanden.
            </div>
            <div
              v-for="sale in stats.recentPluginSales"
              :key="sale.id"
              class="flex items-center justify-between gap-2 py-1.5"
            >
              <div class="flex flex-col gap-0.5 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium truncate">{{ sale.pluginName }}</span>
                  <SaleTypeBadge :renewal="sale.renewal" />
                </div>
                <span class="text-xs text-dimmed">{{ sale.edition }}</span>
              </div>
              <div class="flex flex-col items-end gap-0.5 shrink-0">
                <span class="text-sm tabular-nums">{{ formatCurrency(sale.netAmountEur) }}</span>
                <span class="text-xs text-dimmed">{{ formatDate(sale.dateSold) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
