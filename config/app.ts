import { defineConfig } from '#imports'

export default defineConfig({
  appName: 'open-fortune-claw',
  appKey: process.env.APP_KEY,
  http: {
    host: process.env.HOST || '0.0.0.0',
    port: Number(process.env.PORT) || 3000,
  },
})
