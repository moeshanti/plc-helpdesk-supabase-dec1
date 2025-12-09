import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/.netlify/functions': {
          target: 'http://localhost:8888', // Use local Netlify Dev server
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'd3-time-format': path.resolve(__dirname, 'node_modules/d3-time-format/dist/d3-time-format.min.js'),
        'd3-array': path.resolve(__dirname, 'node_modules/d3-array/dist/d3-array.min.js'),
        'subscribable-things': path.resolve(__dirname, 'node_modules/subscribable-things/build/es5/bundle.js'),
        'recorder-audio-worklet': path.resolve(__dirname, 'node_modules/recorder-audio-worklet/build/es5/bundle.js'),
        'fast-unique-numbers': path.resolve(__dirname, 'node_modules/fast-unique-numbers/build/es5/bundle.js'),
      }
    }
  };
});
