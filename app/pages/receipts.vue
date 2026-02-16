<script setup lang="ts">
useDashboard()
</script>

<template>
  <UDashboardPanel id="receipts">
    <template #header>
      <UDashboardNavbar title="Belege">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <NuxtPage />
    </template>
  </UDashboardPanel>
</template>
