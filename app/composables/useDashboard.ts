import { createSharedComposable } from '@vueuse/core'

const _useDashboard = () => {
  const router = useRouter()

  defineShortcuts({
    'g-h': () => router.push('/'),
    'g-c': () => router.push('/clients'),
    'g-i': () => router.push('/invoices'),
    'g-p': () => router.push('/plugin-sales'),
    'g-b': () => router.push('/receipts'),
    'g-s': () => router.push('/settings')
  })
}

export const useDashboard = createSharedComposable(_useDashboard)
