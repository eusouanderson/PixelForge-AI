import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.{spec,test}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/core/**/*.ts',
        'src/shared/**/*.ts',
        'src/infrastructure/**/*.ts',
        'src/domains/**/*.ts',
        'src/game-engine/**/*.ts'
      ],
      exclude: [
        'src/**/*.{spec,test}.ts',
        'src/**/types.ts',
        'src/**/interfaces.ts',
        'src/**/index.ts'
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100
      },
      all: true
    }
  }
});
