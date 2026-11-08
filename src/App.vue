<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import VirtualCreaturesGame from '@/domains/characters/presentation/VirtualCreaturesGame.vue';

const isPixelArtCreatorMode = import.meta.env.MODE === 'pixelart';

const PixelArtCreatorTool = isPixelArtCreatorMode
  ? defineAsyncComponent(() => import('@/features/pixel-art-viewer/PixelArtViewer.vue'))
  : null;
</script>

<template>
  <component :is="PixelArtCreatorTool" v-if="isPixelArtCreatorMode && PixelArtCreatorTool" />
  <virtual-creatures-game v-else />
</template>
