<script setup lang="ts">
const { user } = useUserSession()
</script>

<template>
  <UPageCard
    title="Profile"
    description="Your GitHub profile information."
    variant="naked"
    class="mb-4"
  />

  <UPageCard variant="subtle">
    <div class="flex max-sm:flex-col justify-between items-start gap-4">
      <div>
        <p class="text-sm font-medium text-highlighted">
          Avatar
        </p>
      </div>
      <UAvatar
        :src="user?.avatarUrl || undefined"
        :alt="user?.name"
        size="lg"
      />
    </div>
    <USeparator />
    <div class="flex max-sm:flex-col justify-between items-start gap-4">
      <div>
        <p class="text-sm font-medium text-highlighted">
          Name
        </p>
      </div>
      <p class="text-sm text-muted">
        {{ user?.name }}
      </p>
    </div>
    <USeparator />
    <div class="flex max-sm:flex-col justify-between items-start gap-4">
      <div>
        <p class="text-sm font-medium text-highlighted">
          Email
        </p>
      </div>
      <p class="text-sm text-muted">
        {{ user?.email || '–' }}
      </p>
    </div>
    <USeparator />
    <div class="flex max-sm:flex-col justify-between items-start gap-4">
      <div>
        <p class="text-sm font-medium text-highlighted">
          GitHub ID
        </p>
      </div>
      <p class="text-sm text-muted">
        {{ user?.githubId }}
      </p>
    </div>
  </UPageCard>
</template>
