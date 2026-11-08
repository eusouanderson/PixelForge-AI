import { createApp } from 'vue';
import App from './App.vue';
import './style.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Offline service worker registration failure gracefully ignored
    });
  });
}

createApp(App).mount('#app');

