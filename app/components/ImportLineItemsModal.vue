<script setup lang="ts">
const props = defineProps<{
  defaultUnitPrice?: number
}>()

const emit = defineEmits<{
  import: [items: LineItem[]]
}>()

const open = defineModel<boolean>('open', { default: false })

const importType = ref('teambox')
const fileInput = ref<HTMLInputElement | null>(null)
const parsedItems = ref<LineItem[]>([])
const parseError = ref('')
const fileName = ref('')

const importTypeOptions = [
  { label: 'TeamBox', value: 'teambox' },
]

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  fileName.value = file.name
  parseError.value = ''
  parsedItems.value = []

  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    if (importType.value === 'teambox') {
      parseTeamBoxCsv(content)
    }
  }
  reader.readAsText(file)
}

function parseCsvLine(line: string, separator: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === separator) {
      fields.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current.trim())
  return fields
}

function parseGermanNumber(value: string): number {
  return parseFloat(value.replace(',', '.')) || 0
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function parseTeamBoxCsv(content: string) {
  const lines = content.split(/\r?\n/).filter(l => l.trim())

  if (lines.length < 2) {
    parseError.value = 'CSV-Datei ist leer oder enthält nur eine Kopfzeile.'
    return
  }

  const header = parseCsvLine(lines[0]!, ';')
  const projektIdx = header.indexOf('Projekt')
  const stundenIdx = header.indexOf('Stunden')

  if (projektIdx === -1 || stundenIdx === -1) {
    parseError.value = 'Ungültiges TeamBox-Format: Spalten "Projekt" und "Stunden" sind erforderlich.'
    return
  }

  const items: LineItem[] = []
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]!, ';')
    const projekt = decodeHtmlEntities(fields[projektIdx] || '')
    const stunden = parseGermanNumber(fields[stundenIdx] || '0')

    if (!projekt || stunden <= 0) continue

    items.push({
      description: projekt,
      quantity: stunden,
      unitPrice: props.defaultUnitPrice || 0,
      vatRate: 20,
    })
  }

  if (items.length === 0) {
    parseError.value = 'Keine gültigen Positionen gefunden (alle Stunden sind 0).'
    return
  }

  parsedItems.value = items
}

function confirmImport() {
  emit('import', parsedItems.value)
  resetAndClose()
}

function resetAndClose() {
  open.value = false
  parsedItems.value = []
  parseError.value = ''
  fileName.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function lineTotal(item: LineItem) {
  return (item.quantity * item.unitPrice).toFixed(2)
}
</script>

<template>
  <UModal v-model:open="open" title="Positionen importieren" @close="resetAndClose">
    <template #header>
      <h3 class="font-semibold text-lg">
        Positionen importieren
      </h3>
    </template>

    <template #body>
      <div class="flex flex-col gap-4">
        <UFormField label="Import-Typ">
          <USelect
            v-model="importType"
            :items="importTypeOptions"
            value-key="value"
            class="w-full"
          />
        </UFormField>

        <UFormField label="CSV-Datei">
          <input
            ref="fileInput"
            type="file"
            accept=".csv"
            class="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer"
            @change="onFileChange"
          >
        </UFormField>

        <UAlert
          v-if="parseError"
          color="error"
          :title="parseError"
          icon="i-lucide-alert-circle"
        />

        <div v-if="parsedItems.length > 0" class="flex flex-col gap-3">
          <p class="text-sm text-muted">
            {{ parsedItems.length }} Position{{ parsedItems.length > 1 ? 'en' : '' }} gefunden:
          </p>

          <div class="max-h-64 overflow-y-auto border border-default rounded">
            <table class="w-full text-sm">
              <thead class="bg-elevated sticky top-0">
                <tr>
                  <th class="text-left p-2">Beschreibung</th>
                  <th class="text-right p-2">Menge</th>
                  <th class="text-right p-2">Einzelpreis</th>
                  <th class="text-right p-2">Gesamt</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in parsedItems" :key="index" class="border-t border-default">
                  <td class="p-2">{{ item.description }}</td>
                  <td class="p-2 text-right tabular-nums">{{ item.quantity }}</td>
                  <td class="p-2 text-right tabular-nums">{{ item.unitPrice.toFixed(2) }} €</td>
                  <td class="p-2 text-right tabular-nums">{{ lineTotal(item) }} €</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="outline" color="neutral" label="Abbrechen" @click="resetAndClose" />
        <UButton
          label="Importieren"
          :disabled="parsedItems.length === 0"
          @click="confirmImport"
        />
      </div>
    </template>
  </UModal>
</template>
