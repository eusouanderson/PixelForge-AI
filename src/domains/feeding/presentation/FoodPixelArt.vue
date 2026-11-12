<script setup lang="ts">
import { computed } from 'vue';
import type {
  DeclarativePixelArt,
  PixelArtOperation
} from '@/core/domain/pixel-art/interfaces';
import { getFoodPixelArt } from '../domain/food-pixel-art-catalog';

interface Props {
  art?: DeclarativePixelArt;
  foodId?: string;
  size?: number | string;
  biteStage?: number;
  alt?: string;
}

const props = withDefaults(defineProps<Props>(), {
  art: undefined,
  foodId: undefined,
  size: 36,
  biteStage: 0,
  alt: 'Alimento ou Remédio'
});

const resolvedArt = computed<DeclarativePixelArt | null>(() => {
  if (props.art) return props.art;
  if (props.foodId) {
    try {
      return getFoodPixelArt(props.foodId);
    } catch {
      return null;
    }
  }
  return null;
});

const width = computed(() => resolvedArt.value?.logicalDimensions.width ?? 16);
const height = computed(() => resolvedArt.value?.logicalDimensions.height ?? 16);

const pixelSizeStyle = computed(() => {
  const s = typeof props.size === 'number' ? `${props.size}px` : props.size;
  return {
    width: s,
    height: s
  };
});

function resolveColor(colorKey: string, palette: Record<string, string>): string {
  const hex = palette[colorKey] ?? colorKey;
  if (hex === '#00000000' || colorKey === 'transparent') {
    return 'transparent';
  }
  return hex;
}

function flattenLayerOperations(
  ops: readonly PixelArtOperation[],
  axisX?: number
): readonly PixelArtOperation[] {
  const result: PixelArtOperation[] = [];
  const midX = axisX ?? Math.floor(width.value / 2);

  for (const op of ops) {
    if (op.type === 'symmetry_h') {
      result.push(...flattenLayerOperations(op.operations, op.axisX ?? midX));
      // Mirror operations horizontally
      for (const sub of op.operations) {
        if (sub.type === 'rect') {
          const mirroredX = 2 * midX - (sub.x + sub.width);
          result.push({ ...sub, x: mirroredX });
        } else if (sub.type === 'pixel') {
          const mirroredX = 2 * midX - sub.x - 1;
          result.push({ ...sub, x: mirroredX });
        } else if (sub.type === 'points') {
          result.push({
            ...sub,
            coordinates: sub.coordinates.map(([x, y]) => [2 * midX - x - 1, y])
          });
        }
      }
    } else {
      result.push(op);
    }
  }

  return result;
}

const activeLayers = computed(() => {
  if (!resolvedArt.value) return [];
  return [...resolvedArt.value.layers]
    .filter((l) => l.visible && l.opacity > 0)
    .sort((a, b) => a.zIndex - b.zIndex);
});

// Unique mask id per instance to prevent conflicts
const maskId = computed(() => {
  const id = resolvedArt.value?.name.toLowerCase().replace(/[^a-z0-9]/g, '-') ?? 'item';
  return `bite-mask-${id}-${props.biteStage}`;
});
</script>

<template>
  <div
    data-testid="food-pixel-art-wrapper"
    class="inline-flex items-center justify-center select-none shrink-0"
    :style="pixelSizeStyle"
    :title="resolvedArt?.name || alt"
  >
    <svg
      v-if="resolvedArt"
      data-testid="food-pixel-art-svg"
      :viewBox="`0 0 ${width} ${height}`"
      class="w-full h-full"
      style="shape-rendering: crispEdges; image-rendering: pixelated; image-rendering: -moz-crisp-edges; image-rendering: crisp-edges;"
      xmlns="http://www.w3.org/2000/svg"
      :aria-label="resolvedArt.name || alt"
    >
      <defs v-if="biteStage > 0">
        <mask :id="maskId">
          <!-- White reveals all by default -->
          <rect x="0" y="0" :width="width" :height="height" fill="#ffffff" />
          <!-- Bite Stage 1: Mordida 1 (corte circular de mordida no canto superior direito) -->
          <circle
            v-if="biteStage === 1"
            cx="13"
            cy="4"
            r="4.5"
            fill="#000000"
          />
          <circle
            v-if="biteStage === 1"
            cx="14"
            cy="7"
            r="2.5"
            fill="#000000"
          />
          <!-- Bite Stage 2: Mordida 2 (quase todo comido, sobrando só um pedaço inferior esquerdo) -->
          <circle
            v-if="biteStage >= 2"
            cx="11"
            cy="5"
            r="6.5"
            fill="#000000"
          />
          <circle
            v-if="biteStage >= 2"
            cx="7"
            cy="4"
            r="4"
            fill="#000000"
          />
          <circle
            v-if="biteStage >= 2"
            cx="12"
            cy="11"
            r="4"
            fill="#000000"
          />
          <!-- Bite Stage 3: Totalmente comido / engolido -->
          <rect
            v-if="biteStage >= 3"
            x="0"
            y="0"
            :width="width"
            :height="height"
            fill="#000000"
          />
        </mask>
      </defs>

      <g :mask="biteStage > 0 ? `url(#${maskId})` : undefined">
        <g
          v-for="layer in activeLayers"
          :key="layer.id"
          :opacity="layer.opacity"
        >
          <template
            v-for="(op, opIdx) in flattenLayerOperations(layer.operations)"
            :key="opIdx"
          >
            <!-- Rect Operation -->
            <rect
              v-if="op.type === 'rect'"
              :x="op.x"
              :y="op.y"
              :width="op.width"
              :height="op.height"
              :fill="resolveColor(op.color, resolvedArt.palette)"
            />

            <!-- Pixel Operation -->
            <rect
              v-else-if="op.type === 'pixel'"
              :x="op.x"
              :y="op.y"
              width="1"
              height="1"
              :fill="resolveColor(op.color, resolvedArt.palette)"
            />

            <!-- Points Operation -->
            <template v-else-if="op.type === 'points'">
              <rect
                v-for="(coord, cIdx) in op.coordinates"
                :key="cIdx"
                :x="coord[0]"
                :y="coord[1]"
                width="1"
                height="1"
                :fill="resolveColor(op.color, resolvedArt.palette)"
              />
            </template>

            <!-- Line Operation -->
            <line
              v-else-if="op.type === 'line'"
              :x1="op.x0 + 0.5"
              :y1="op.y0 + 0.5"
              :x2="op.x1 + 0.5"
              :y2="op.y1 + 0.5"
              :stroke="resolveColor(op.color, resolvedArt.palette)"
              stroke-width="1"
            />

            <!-- Circle Operation -->
            <circle
              v-else-if="op.type === 'circle'"
              :cx="op.cx + 0.5"
              :cy="op.cy + 0.5"
              :r="op.radius"
              :fill="op.fill ? resolveColor(op.color, resolvedArt.palette) : 'none'"
              :stroke="op.fill ? 'none' : resolveColor(op.color, resolvedArt.palette)"
              stroke-width="1"
            />

            <!-- Stroke Rect Operation -->
            <rect
              v-else-if="op.type === 'stroke_rect'"
              :x="op.x + 0.5"
              :y="op.y + 0.5"
              :width="op.width"
              :height="op.height"
              fill="none"
              :stroke="resolveColor(op.color, resolvedArt.palette)"
              stroke-width="1"
            />
          </template>
        </g>
      </g>
    </svg>

    <!-- Fallback if art is missing -->
    <div
      v-else
      class="w-full h-full rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-500 font-bold"
    >
      ?
    </div>
  </div>
</template>
