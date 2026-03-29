import { defineConfig } from '@adonisjs/core/hash'

export default defineConfig({
  default: 'scrypt',
  scrypt: {
    cost: 16384,
    blockSize: 8,
    parallelization: 1,
    memorySize: 32768,
  },
})
