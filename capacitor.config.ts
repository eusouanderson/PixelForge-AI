import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.pixelforge.virtualcreatures',
  appName: 'PixelForge Virtual Creatures',
  webDir: 'dist',
  backgroundColor: '#020617',
  server: {
    androidScheme: 'https'
  }
};

export default config;

