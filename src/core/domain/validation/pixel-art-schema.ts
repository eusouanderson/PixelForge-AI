import { z } from 'zod';
import type { DeclarativePixelArt } from '../pixel-art/interfaces';

const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export const rectOperationSchema = z.object({
  type: z.literal('rect'),
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  color: z.string().min(1)
});

export const strokeRectOperationSchema = z.object({
  type: z.literal('stroke_rect'),
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  color: z.string().min(1)
});

export const lineOperationSchema = z.object({
  type: z.literal('line'),
  x0: z.number().int(),
  y0: z.number().int(),
  x1: z.number().int(),
  y1: z.number().int(),
  color: z.string().min(1)
});

export const circleOperationSchema = z.object({
  type: z.literal('circle'),
  cx: z.number().int(),
  cy: z.number().int(),
  radius: z.number().int().nonnegative(),
  color: z.string().min(1),
  fill: z.boolean().optional()
});

export const pointsOperationSchema = z.object({
  type: z.literal('points'),
  color: z.string().min(1),
  coordinates: z.array(z.tuple([z.number().int(), z.number().int()]))
});

export const pixelOperationSchema = z.object({
  type: z.literal('pixel'),
  x: z.number().int(),
  y: z.number().int(),
  color: z.string().min(1)
});

export const fillOperationSchema = z.object({
  type: z.literal('fill'),
  color: z.string().min(1)
});

export const baseOperationSchema = z.discriminatedUnion('type', [
  rectOperationSchema,
  strokeRectOperationSchema,
  lineOperationSchema,
  circleOperationSchema,
  pointsOperationSchema,
  pixelOperationSchema,
  fillOperationSchema
]);

export type AnyOperationSchema = z.infer<typeof baseOperationSchema> | {
  type: 'symmetry_h';
  axisX?: number;
  operations: AnyOperationSchema[];
};

export const pixelArtOperationSchema: z.ZodType<AnyOperationSchema> = z.lazy(() =>
  z.union([
    baseOperationSchema,
    z.object({
      type: z.literal('symmetry_h'),
      axisX: z.number().int().optional(),
      operations: z.array(pixelArtOperationSchema)
    })
  ])
);

export const pixelArtLayerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  visible: z.boolean().default(true),
  opacity: z.number().min(0).max(1).default(1),
  zIndex: z.number().int().default(0),
  operations: z.array(pixelArtOperationSchema)
});

export const pixelArtMetadataSchema = z
  .object({
    author: z.string().optional(),
    createdAt: z.string().optional(),
    tags: z.array(z.string()).optional(),
    creatureName: z.string().optional(),
    lifeStage: z.string().optional(),
    animation: z.string().optional(),
    frame: z.number().int().optional()
  })
  .passthrough();

export const pixelArtSchema = z
  .object({
    $schema: z.string().optional(),
    version: z.string().default('1.0.0'),
    name: z.string().min(1),
    description: z.string().default(''),
    logicalDimensions: z.object({
      width: z.number().int().positive(),
      height: z.number().int().positive()
    }),
    palette: z.record(z.string(), z.string().regex(hexColorRegex)),
    layers: z.array(pixelArtLayerSchema),
    metadata: pixelArtMetadataSchema.optional()
  })
  .superRefine((data, ctx) => {
    const paletteKeys = new Set(Object.keys(data.palette));

    function checkOps(ops: AnyOperationSchema[], layerId: string) {
      for (const op of ops) {
        if ('color' in op && typeof op.color === 'string') {
          if (!paletteKeys.has(op.color)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Cor '${op.color}' utilizada na camada '${layerId}' não foi definida na paleta.`,
              path: ['layers']
            });
          }
        }
        if (op.type === 'symmetry_h') {
          checkOps(op.operations, layerId);
        }
      }
    }

    for (const layer of data.layers) {
      checkOps(layer.operations as AnyOperationSchema[], layer.id);
    }
  });

export function validatePixelArt(input: unknown): DeclarativePixelArt {
  return pixelArtSchema.parse(input) as DeclarativePixelArt;
}
