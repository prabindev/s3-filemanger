import { defineConfig } from '@prisma/config'

export default defineConfig({
  earlyAccess: true,
  migrations: {
    url: process.env.DATABASE_URL,
  },
})
