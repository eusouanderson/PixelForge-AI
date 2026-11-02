import { describe, it, expect } from 'vitest';
import { PixelBuffer } from './pixel-buffer';

describe('PixelBuffer', () => {
  it('creates buffer with correct dimensions and byteLength', () => {
    const buffer = new PixelBuffer(16, 16);
    expect(buffer.width).toBe(16);
    expect(buffer.height).toBe(16);
    expect(buffer.arrayBuffer.byteLength).toBe(16 * 16 * 4);
    expect(buffer.uint32View.length).toBe(256);
  });

  it('checks bounds correctly', () => {
    const buffer = new PixelBuffer(10, 10);
    expect(buffer.inBounds(0, 0)).toBe(true);
    expect(buffer.inBounds(9, 9)).toBe(true);
    expect(buffer.inBounds(-1, 0)).toBe(false);
    expect(buffer.inBounds(10, 5)).toBe(false);
  });

  it('sets and gets pixel colors', () => {
    const buffer = new PixelBuffer(8, 8);
    const color = 0xff00ff00;
    buffer.setPixel(4, 4, color);
    expect(buffer.getPixel(4, 4)).toBe(color);
    expect(buffer.getPixel(0, 0)).toBe(0);
    expect(buffer.getPixel(10, 10)).toBe(0);
  });

  it('clears buffer with specific color', () => {
    const buffer = new PixelBuffer(4, 4);
    buffer.clear(0xff123456);
    expect(buffer.getPixel(0, 0)).toBe(0xff123456);
    expect(buffer.getPixel(3, 3)).toBe(0xff123456);
  });

  it('clones buffer independently', () => {
    const buffer = new PixelBuffer(4, 4);
    buffer.setPixel(1, 1, 0xffffffff);
    const clone = buffer.clone();
    expect(clone.getPixel(1, 1)).toBe(0xffffffff);

    clone.setPixel(1, 1, 0x00000000);
    expect(buffer.getPixel(1, 1)).toBe(0xffffffff);
    expect(clone.getPixel(1, 1)).toBe(0x00000000);
  });

  it('creates ImageData compatible representation', () => {
    const buffer = new PixelBuffer(2, 2);
    const imgData = buffer.getImageData();
    expect(imgData.width).toBe(2);
    expect(imgData.height).toBe(2);
    expect(imgData.data.length).toBe(16);
  });
});

