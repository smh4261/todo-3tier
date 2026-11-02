import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // /api 요청을 Express 서버로 넘긴다. (vite preview도 이 설정을 그대로 쓴다)
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
