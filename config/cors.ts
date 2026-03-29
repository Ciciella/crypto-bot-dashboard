import { defineConfig } from '@adonisjs/cors'

export default defineConfig({
  enabled: true,
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  headers: ['Content-Type', 'Authorization'],
  exposeHeaders: [],
  credentials: false,
  maxAge: 90,
})
