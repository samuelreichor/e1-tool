<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})
</script>

<template>
  <UPageCard class="w-full max-w-sm" title="SR Accounting" description="Sign in to continue">
    <UButton
      to="/auth/github"
      icon="i-simple-icons-github"
      label="Sign in with GitHub"
      color="neutral"
      variant="subtle"
      block
      external
    />
  </UPageCard>
</template>
