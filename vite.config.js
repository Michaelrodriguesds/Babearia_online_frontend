import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const nome = env.VITE_APP_NOME || 'Agenda Barbearia';

  return {
    plugins: [
      react(),
      // Transforma o site em app instalável (Android e iPhone), com notificações
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/*.png', 'push-sw.js'],
        manifest: {
          name: nome,
          short_name: nome.length > 12 ? 'Agenda' : nome,
          description: 'Agenda online e avisos de agendamento para barbearias',
          lang: 'pt-BR',
          start_url: '/painel',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#F2F3EF',
          theme_color: '#1B2238',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          importScripts: ['push-sw.js'], // código das notificações push
          navigateFallback: '/index.html',
          globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        },
      }),
    ],
    server: { port: 5173, host: true }, // host: true = abre no celular pela rede Wi-Fi
  };
});
