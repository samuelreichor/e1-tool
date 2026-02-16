<script setup lang="ts">
const { user } = useUserSession()

useDashboard()
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
      <div class="flex flex-col items-center justify-center min-h-48 gap-2">
        <UIcon name="i-lucide-layout-dashboard" class="size-12 text-dimmed" />
        <h2 class="text-xl font-semibold">
          Welcome, {{ user?.name }}
        </h2>
        <p class="text-dimmed">
          Your accounting dashboard will appear here.
        </p>
      </div>
    </template>
  </UDashboardPanel>
</template>
