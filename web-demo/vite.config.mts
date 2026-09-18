// 작성자: 김진우 — 모바일 화면과 실제 API를 재사용하며 네이티브 전용 기능만 웹에 맞춘다.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { transformAsync } from '@babel/core';
const here = fileURLToPath(new URL('.', import.meta.url));
const root = fileURLToPath(new URL('../', import.meta.url));
export default defineConfig({
  root: here,
  plugins: [
    {
      name: 'heapy-native-markdown-jsx',
      enforce: 'pre',
      async transform(code, id) {
        if (
          !/node_modules\/react-native-(markdown-display|fit-image)\/.*\.js$/.test(
            id,
          )
        )
          return;
        const result = await transformAsync(code, {
          filename: id,
          configFile: false,
          babelrc: false,
          plugins: ['@babel/plugin-transform-react-jsx'],
        });
        return result?.code;
      },
    },
    {
      name: 'heapy-assets',
      enforce: 'pre',
      transform(code, id) {
        if (!id.includes('/src/') || !/\.[jt]sx?$/.test(id)) return;
        let imports = '';
        let n = 0;
        const transformed = code.replace(
          /require\(['"]([^'"]+\.(?:png|jpg|jpeg))['"]\)/g,
          (_match, path) => {
            const name = `__asset${n++}`;
            imports += `import ${name} from '${path}';\n`;
            return `{uri: ${name}}`;
          },
        );
        return imports + transformed;
      },
    },
    react(),
  ],
  resolve: {
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.jsx', '.js', '.json'],
    alias: [
      { find: /^react-native$/, replacement: here + 'native.ts' },
      { find: 'react-native-config', replacement: here + 'config.ts' },
      { find: 'react-native-keychain', replacement: here + 'keychain.ts' },
      {
        find: /^react-native-safe-area-context$/,
        replacement:
          root + 'node_modules/react-native-safe-area-context/src/index.tsx',
      },
      {
        find: /.*\/pickCheckupFile$/,
        replacement: here + 'pickCheckupFile.ts',
      },
      { find: /.*\/healthRefresh$/, replacement: here + 'healthRefresh.ts' },
      {
        find: 'react-native-linear-gradient',
        replacement: here + 'gradient.tsx',
      },
      { find: /^react-native-svg$/, replacement: here + 'svg.tsx' },
    ],
  },
  define: { __DEV__: 'false', global: 'globalThis' },
  server: {
    host: '127.0.0.1',
    port: 5195,
    strictPort: true,
    fs: { allow: [root] },
    proxy: {
      '/api/demo-login': {
        target: 'https://heapy-web-demo.vercel.app',
        changeOrigin: true,
        secure: true,
      },
      '/api': {
        target: 'https://13.125.12.94',
        changeOrigin: true,
        secure: true,
        timeout: 130000,
        proxyTimeout: 130000,
      },
    },
  },
  preview: {
    proxy: {
      '/api/demo-login': {
        target: 'https://heapy-web-demo.vercel.app',
        changeOrigin: true,
        secure: true,
      },
      '/api': {
        target: 'https://13.125.12.94',
        changeOrigin: true,
        secure: true,
        timeout: 130000,
        proxyTimeout: 130000,
      },
    },
  },
  build: { outDir: '../dist-web', emptyOutDir: true },
});
