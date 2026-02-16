export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const result = await syncPluginSales()
  return result
})
