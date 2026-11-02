import type {
  DeclarativePixelArt,
  PixelArtLayer,
  PixelArtOperation,
  RectOperation,
  StrokeRectOperation,
  LineOperation,
  CircleOperation,
  PointsOperation,
  PixelOperation,
  FillOperation,
  SymmetryHorizontalOperation
} from '@/core/domain/pixel-art/interfaces';
import { PixelBuffer } from '@/core/domain/canvas/pixel-buffer';
import { hexToUint32, blendUint32Colors } from '@/core/domain/canvas/color';

export class Canvas2dRenderer {
  public renderToBuffer(art: DeclarativePixelArt): PixelBuffer {
    const width = art.logicalDimensions.width;
    const height = art.logicalDimensions.height;
    const compositeBuffer = new PixelBuffer(width, height);

    const sortedLayers = [...art.layers]
      .filter((l) => l.visible && l.opacity > 0)
      .sort((a, b) => a.zIndex - b.zIndex);

    for (const layer of sortedLayers) {
      const layerBuffer = this.rasterizeLayer(layer, width, height, art.palette);
      this.compositeLayer(compositeBuffer, layerBuffer, layer.opacity);
    }

    return compositeBuffer;
  }

  public rasterizeLayer(
    layer: PixelArtLayer,
    width: number,
    height: number,
    palette: Record<string, string>
  ): PixelBuffer {
    const buffer = new PixelBuffer(width, height);
    for (const op of layer.operations) {
      this.executeOperation(buffer, op, palette, width);
    }
    return buffer;
  }

  private executeOperation(
    buffer: PixelBuffer,
    op: PixelArtOperation,
    palette: Record<string, string>,
    canvasWidth: number
  ): void {
    switch (op.type) {
      case 'rect':
        this.drawRect(buffer, op, palette);
        break;
      case 'stroke_rect':
        this.drawStrokeRect(buffer, op, palette);
        break;
      case 'line':
        this.drawLine(buffer, op, palette);
        break;
      case 'circle':
        this.drawCircle(buffer, op, palette);
        break;
      case 'points':
        this.drawPoints(buffer, op, palette);
        break;
      case 'pixel':
        this.drawPixel(buffer, op, palette);
        break;
      case 'fill':
        this.drawFill(buffer, op, palette);
        break;
      case 'symmetry_h':
        this.drawSymmetryH(buffer, op, palette, canvasWidth);
        break;
    }
  }

  private getColorUint32(colorKey: string, palette: Record<string, string>): number {
    const hex = palette[colorKey];
    if (!hex) return 0;
    return hexToUint32(hex);
  }

  private drawRect(buffer: PixelBuffer, op: RectOperation, palette: Record<string, string>): void {
    const color = this.getColorUint32(op.color, palette);
    const startX = Math.max(0, op.x);
    const startY = Math.max(0, op.y);
    const endX = Math.min(buffer.width, op.x + op.width);
    const endY = Math.min(buffer.height, op.y + op.height);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        buffer.setPixel(x, y, color);
      }
    }
  }

  private drawStrokeRect(
    buffer: PixelBuffer,
    op: StrokeRectOperation,
    palette: Record<string, string>
  ): void {
    const color = this.getColorUint32(op.color, palette);
    const left = op.x;
    const right = op.x + op.width - 1;
    const top = op.y;
    const bottom = op.y + op.height - 1;

    for (let x = left; x <= right; x++) {
      buffer.setPixel(x, top, color);
      buffer.setPixel(x, bottom, color);
    }
    for (let y = top; y <= bottom; y++) {
      buffer.setPixel(left, y, color);
      buffer.setPixel(right, y, color);
    }
  }

  private drawLine(buffer: PixelBuffer, op: LineOperation, palette: Record<string, string>): void {
    const color = this.getColorUint32(op.color, palette);
    let x0 = op.x0;
    let y0 = op.y0;
    const x1 = op.x1;
    const y1 = op.y1;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      buffer.setPixel(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  private drawCircle(buffer: PixelBuffer, op: CircleOperation, palette: Record<string, string>): void {
    const color = this.getColorUint32(op.color, palette);
    const r = op.radius;
    const isFill = op.fill !== false;

    if (isFill) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy <= r * r) {
            buffer.setPixel(op.cx + dx, op.cy + dy, color);
          }
        }
      }
    } else {
      let x = r;
      let y = 0;
      let err = 0;

      while (x >= y) {
        buffer.setPixel(op.cx + x, op.cy + y, color);
        buffer.setPixel(op.cx + y, op.cy + x, color);
        buffer.setPixel(op.cx - y, op.cy + x, color);
        buffer.setPixel(op.cx - x, op.cy + y, color);
        buffer.setPixel(op.cx - x, op.cy - y, color);
        buffer.setPixel(op.cx - y, op.cy - x, color);
        buffer.setPixel(op.cx + y, op.cy - x, color);
        buffer.setPixel(op.cx + x, op.cy - y, color);

        if (err <= 0) {
          y += 1;
          err += 2 * y + 1;
        }
        if (err > 0) {
          x -= 1;
          err -= 2 * x + 1;
        }
      }
    }
  }

  private drawPoints(buffer: PixelBuffer, op: PointsOperation, palette: Record<string, string>): void {
    const color = this.getColorUint32(op.color, palette);
    for (const [px, py] of op.coordinates) {
      buffer.setPixel(px, py, color);
    }
  }

  private drawPixel(buffer: PixelBuffer, op: PixelOperation, palette: Record<string, string>): void {
    const color = this.getColorUint32(op.color, palette);
    buffer.setPixel(op.x, op.y, color);
  }

  private drawFill(buffer: PixelBuffer, op: FillOperation, palette: Record<string, string>): void {
    const color = this.getColorUint32(op.color, palette);
    buffer.clear(color);
  }

  private drawSymmetryH(
    buffer: PixelBuffer,
    op: SymmetryHorizontalOperation,
    palette: Record<string, string>,
    canvasWidth: number
  ): void {
    const axis = op.axisX ?? Math.floor(canvasWidth / 2);

    for (const subOp of op.operations) {
      this.executeOperation(buffer, subOp, palette, canvasWidth);
      const mirroredOp = this.mirrorOperationH(subOp, axis);
      if (mirroredOp) {
        this.executeOperation(buffer, mirroredOp, palette, canvasWidth);
      }
    }
  }

  private mirrorOperationH(op: PixelArtOperation, axis: number): PixelArtOperation | null {
    switch (op.type) {
      case 'pixel':
        return {
          type: 'pixel',
          x: 2 * axis - op.x,
          y: op.y,
          color: op.color
        };
      case 'points':
        return {
          type: 'points',
          color: op.color,
          coordinates: op.coordinates.map(([px, py]) => [2 * axis - px, py])
        };
      case 'rect':
        return {
          type: 'rect',
          x: 2 * axis - (op.x + op.width),
          y: op.y,
          width: op.width,
          height: op.height,
          color: op.color
        };
      case 'stroke_rect':
        return {
          type: 'stroke_rect',
          x: 2 * axis - (op.x + op.width),
          y: op.y,
          width: op.width,
          height: op.height,
          color: op.color
        };
      case 'line':
        return {
          type: 'line',
          x0: 2 * axis - op.x0,
          y0: op.y0,
          x1: 2 * axis - op.x1,
          y1: op.y1,
          color: op.color
        };
      case 'circle':
        return {
          type: 'circle',
          cx: 2 * axis - op.cx,
          cy: op.cy,
          radius: op.radius,
          color: op.color,
          fill: op.fill
        };
      default:
        return null;
    }
  }

  private compositeLayer(dst: PixelBuffer, src: PixelBuffer, opacity: number): void {
    const totalPixels = dst.width * dst.height;
    for (let i = 0; i < totalPixels; i++) {
      const srcVal = src.uint32View[i];
      if ((srcVal & 0xff000000) === 0) continue;
      const dstVal = dst.uint32View[i];
      dst.uint32View[i] = blendUint32Colors(dstVal, srcVal, opacity);
    }
  }

  public renderToCanvas(
    targetCanvas: HTMLCanvasElement,
    art: DeclarativePixelArt,
    targetWidth: number,
    targetHeight: number,
    showGrid: boolean = false
  ): void {
    const buffer = this.renderToBuffer(art);
    targetCanvas.width = targetWidth;
    targetCanvas.height = targetHeight;

    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const offscreen = document.createElement('canvas');
    offscreen.width = buffer.width;
    offscreen.height = buffer.height;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    const imgData = new ImageData(
      new Uint8ClampedArray(buffer.uint8ClampedView),
      buffer.width,
      buffer.height
    );
    offCtx.putImageData(imgData, 0, 0);

    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(offscreen, 0, 0, targetWidth, targetHeight);

    if (showGrid) {
      const stepX = targetWidth / buffer.width;
      const stepY = targetHeight / buffer.height;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;

      for (let x = 0; x <= buffer.width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * stepX, 0);
        ctx.lineTo(x * stepX, targetHeight);
        ctx.stroke();
      }

      for (let y = 0; y <= buffer.height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * stepY);
        ctx.lineTo(targetWidth, y * stepY);
        ctx.stroke();
      }
    }
  }

  public async exportPngBlob(
    art: DeclarativePixelArt,
    width: number = 1024,
    height: number = 1024
  ): Promise<Blob> {
    const canvas = document.createElement('canvas');
    this.renderToCanvas(canvas, art, width, height, false);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Falha ao gerar Blob PNG'));
        }
      }, 'image/png');
    });
  }
}

