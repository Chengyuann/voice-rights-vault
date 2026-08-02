import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { attachVoiceApi } from './server/voice-api.ts'

function voiceApiPlugin(): Plugin {
  return {
    name: 'voice-rights-api',
    configureServer(server) {
      attachVoiceApi(server.middlewares)
    },
    configurePreviewServer(server) {
      attachVoiceApi(server.middlewares)
    },
  }
}

export default defineConfig({
  plugins: [react(), voiceApiPlugin()],
})
