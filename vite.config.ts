/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // Zona fija para que los tests de fechas den lo mismo en cualquier máquina. Lima (UTC-5)
    // cubre el caso en que la fecha UTC ya es el día siguiente.
    env: { TZ: 'America/Lima' },
  },
})
