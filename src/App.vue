<script setup lang="ts">
import { computed } from 'vue';
import VirtualCreaturesGame from '@/domains/characters/presentation/VirtualCreaturesGame.vue';
import PixelArtViewer from '@/features/pixel-art-viewer/PixelArtViewer.vue';

const urlParams =
  typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
const urlMode = urlParams?.get('mode');

const isPixelArtMode = computed(() => {
  if (urlMode === 'pixelart' || urlMode === 'studio') return true;
  if (urlMode === 'game' || urlMode === 'apk') return false;
  return import.meta.env.MODE === 'pixelart';
});
</script>

<template>
  <pixel-art-viewer v-if="isPixelArtMode" />
  <virtual-creatures-game v-else />
</template>
