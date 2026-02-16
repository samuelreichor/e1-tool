<script setup lang="ts">
useDashboard()
</script>

<template>
  <UDashboardPanel id="plugin-sales">
    <template #header>
      <UDashboardNavbar title="Plugin Sales">
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
