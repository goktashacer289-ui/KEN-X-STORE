export function formatFileSize(bytes?: number): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export function formatShortSha256(hash?: string): string {
  if (!hash) return '—';
  if (hash.length <= 18) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

export async function computeFileSha256Hex(file: File): Promise<string | null> {
  try {
    if (!window.crypto?.subtle) return null;
    const buffer = await file.arrayBuffer();
    const digest = await window.crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return null;
  }
}

export async function compressImageFileForCloud(
  file: File,
  kind: 'logoUrl' | 'banner'
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Lütfen yalnızca geçerli bir görsel dosyası seçiniz.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Görsel boyutu en fazla 5 MB olmalıdır.');
  }

  const maxChars = kind === 'logoUrl' ? 320000 : 420000;
  const maxDim = kind === 'logoUrl' ? 256 : 1200;

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Görsel okunamadı.'));
    };
    reader.onerror = () => reject(new Error('Görsel okunamadı.'));
    reader.readAsDataURL(file);
  });

  if (rawDataUrl.length <= maxChars) {
    return rawDataUrl;
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Görsel işlenemedi.'));
    image.src = rawDataUrl;
  });

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const targetW = Math.max(1, Math.round(img.width * scale));
  const targetH = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Görsel sıkıştırma bağlamı oluşturulamadı.');
  }
  ctx.drawImage(img, 0, 0, targetW, targetH);

  let compressed = canvas.toDataURL('image/webp', 0.85);
  if (compressed.length > maxChars) {
    compressed = canvas.toDataURL('image/jpeg', 0.82);
  }
  if (compressed.length > maxChars) {
    compressed = canvas.toDataURL('image/jpeg', 0.65);
  }
  if (compressed.length > maxChars) {
    throw new Error('Görsel sıkıştırılmasına rağmen bulut sınırını aşıyor. Lütfen daha küçük bir görsel seçin.');
  }
  return compressed;
}
