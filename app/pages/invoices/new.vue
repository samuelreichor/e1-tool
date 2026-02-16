<script setup lang="ts">
const router = useRouter()

function onSaved(invoice: Invoice) {
  router.push(`/invoices/${invoice.id}`)
}
</script>

<template>
  <div class="p-4 max-w-4xl mx-auto">
    <h2 class="text-lg font-semibold mb-4">
      Neue Rechnung
    </h2>
    <InvoiceForm @saved="onSaved" />
  </div>
</template>
