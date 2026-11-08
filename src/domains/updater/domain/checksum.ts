export async function calculateSha256(data: ArrayBuffer | Uint8Array): Promise<string> {
  let arrayBuffer: ArrayBuffer;
  if (data instanceof ArrayBuffer) {
    arrayBuffer = data;
  } else {
    // Isolate bytes into a dedicated ArrayBuffer to avoid SharedArrayBuffer type mismatch
    const copy = new Uint8Array(data.byteLength);
    copy.set(data);
    arrayBuffer = copy.buffer;
  }

  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(digest));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Node.js fallback if crypto.subtle is unavailable
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(new Uint8Array(arrayBuffer)).digest('hex');
}

export async function verifySha256(
  data: ArrayBuffer | Uint8Array,
  expectedChecksum: string
): Promise<boolean> {
  const calculated = await calculateSha256(data);
  return calculated.toLowerCase() === expectedChecksum.trim().toLowerCase();
}
