export class PixelBuffer {
  public readonly width: number;
  public readonly height: number;
  public readonly arrayBuffer: ArrayBuffer;
  public readonly uint32View: Uint32Array;
  public readonly uint8ClampedView: Uint8ClampedArray;

  constructor(width: number, height: number, existingBuffer?: ArrayBuffer) {
    this.width = width;
    this.height = height;
    const byteLength = width * height * 4;
    this.arrayBuffer = existingBuffer ?? new ArrayBuffer(byteLength);
    this.uint32View = new Uint32Array(this.arrayBuffer);
    this.uint8ClampedView = new Uint8ClampedArray(this.arrayBuffer);
  }

  public inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  public getPixel(x: number, y: number): number {
    if (!this.inBounds(x, y)) return 0;
    return this.uint32View[y * this.width + x];
  }

  public setPixel(x: number, y: number, color: number): void {
    if (!this.inBounds(x, y)) return;
    this.uint32View[y * this.width + x] = color;
  }

  public clear(color: number = 0): void {
    this.uint32View.fill(color);
  }

  public clone(): PixelBuffer {
    const copyBuffer = this.arrayBuffer.slice(0);
    return new PixelBuffer(this.width, this.height, copyBuffer);
  }

  public getImageData(): ImageData {
    return new ImageData(new Uint8ClampedArray(this.arrayBuffer), this.width, this.height);
  }
}

