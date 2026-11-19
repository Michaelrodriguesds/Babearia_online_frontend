import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { ICONES } from './src/icones.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const nome = env.VITE_APP_NOME || 'Agenda Barbearia';

  // Manifest do app (instalar no celular). O padrão usa o ícone da marca; cada tipo de negócio
  // ganha um manifest com o próprio ícone, trocado em tempo real por src/tipos.js.
  const manifesto = (icone, cor) => ({
    name: nome,
    short_name: nome.length > 12 ? 'Agenda' : nome,
    description: 'Agenda online com Pix e avisos de agendamento',
    lang: 'pt-BR',
    start_url: '/painel',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F2F3EF',
    theme_color: cor,
    icons: icone
      ? [
        { src: `/icons/tipos/${icone}-192.png`, sizes: '192x192', type: 'image/png' },
        { src: `/icons/tipos/${icone}-512.png`, sizes: '512x512', type: 'image/png' },
        { src: `/icons/tipos/${icone}-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ]
      : [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
  });
  const manifestosPorIcone = {
    name: 'manifestos-por-icone',
    generateBundle() {
      Object.entries(ICONES).forEach(([chave, { cor }]) => {
        this.emitFile({ type: 'asset', fileName: `icons/tipos/${chave}.webmanifest`, source: JSON.stringify(manifesto(chave, cor)) });
      });
    },
  };

  return {
    plugins: [
      react(),
      manifestosPorIcone,
      // Transforma o site em app instalável (Android e iPhone), com notificações
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false, // o registro é feito em src/registrarApp.js, com tratamento de erro
        includeAssets: ['icons/*.png', 'push-sw.js'],
        manifest: manifesto(null, '#1B2238'),
        workbox: {
          importScripts: ['push-sw.js'], // código das notificações push
          navigateFallback: '/index.html',
          globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
          globIgnores: ['icons/tipos/**'], // ícones de cada negócio: baixados só quando precisa
        },
      }),
    ],
    server: { port: 5173, host: true }, // host: true = abre no celular pela rede Wi-Fi
  };
});
