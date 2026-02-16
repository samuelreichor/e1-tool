declare module '#auth-utils' {
  interface User {
    githubId: number
    name: string
    email: string | null
    avatarUrl: string | null
  }
}

export {}
