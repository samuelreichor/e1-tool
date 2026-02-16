<script setup lang="ts">
useDashboard()
</script>

<template>
  <UDashboardPanel id="clients">
    <template #header>
      <UDashboardNavbar title="Kunden">
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
