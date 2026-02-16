import { eq } from 'drizzle-orm'
import { users } from '~~/server/db/schema'

export default defineOAuthGitHubEventHandler({
  async onSuccess(event, { user: githubUser }) {
    const allowedGithubId = Number(useRuntimeConfig().allowedGithubId)

    if (githubUser.id !== allowedGithubId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied. Only the authorized user can sign in.'
      })
    }

    // Upsert user in database
    const existing = await db.select().from(users).where(eq(users.githubId, githubUser.id)).limit(1)

    if (existing.length > 0) {
      await db.update(users).set({
        name: githubUser.name || githubUser.login,
        email: githubUser.email,
        avatarUrl: githubUser.avatar_url,
        updatedAt: new Date()
      }).where(eq(users.githubId, githubUser.id))
    } else {
      await db.insert(users).values({
        githubId: githubUser.id,
        name: githubUser.name || githubUser.login,
        email: githubUser.email,
        avatarUrl: githubUser.avatar_url
      })
    }

    await setUserSession(event, {
      user: {
        githubId: githubUser.id,
        name: githubUser.name || githubUser.login,
        email: githubUser.email,
        avatarUrl: githubUser.avatar_url
      }
    })

    return sendRedirect(event, '/')
  },
  onError(event, error) {
    console.error('GitHub OAuth error:', error)
    return sendRedirect(event, '/login')
  }
})
