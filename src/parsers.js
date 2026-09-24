/**
 * 抓取资源并上报加载进度（0~1），返回 ArrayBuffer。
 * 当响应没有 Content-Length（无法计算进度）时，会先上报 null。
 */
export async function fetchWithProgress(url, onProgress) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);

  const report = (ratio) => {
    if (typeof onProgress === 'function') onProgress(ratio);
  };

  const total = Number(response.headers.get('Content-Length')) || 0;
  if (!response.body || !total) {
    report(null);
    return response.arrayBuffer();
  }

  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      report(Math.min(received / total, 1));
    }
  }
  report(1);

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes.buffer;
}

export async function parseAndroidLivePhoto(imageSrc, onProgress) {
  const buffer = await fetchWithProgress(imageSrc, onProgress);
  const video = extractAndroidVideo(buffer);
  if (!video) throw new Error('No video found in Android Live Photo');
  return { video };
}

/**
 * 从 Android LivePhoto 文件缓冲中提取视频部分，未找到时返回 null
 */
export function extractAndroidVideo(buffer) {
  const offset = findVideoOffset(buffer);
  if (offset > 0) {
    return new Blob([buffer.slice(offset)], { type: 'video/mp4' });
  }
  return null;
}

function findVideoOffset(buffer) {
  // 1. Google MicroVideoOffset (XMP)
  const text = new TextDecoder().decode(buffer);
  let match = text.match(/MicroVideoOffset=["']?(\d+)["']?/);
  if (!match) match = text.match(/MicroVideoOffset>(\d+)</);
  
  if (match) {
    const reverseOffset = parseInt(match[1], 10);
    return buffer.byteLength - reverseOffset;
  }

  // 2. Fallback: Search for 'ftyp'
  const view = new Uint8Array(buffer);
  const ftyp = [0x66, 0x74, 0x79, 0x70];
  
  for (let i = 0; i < view.length - 4; i++) {
    if (view[i] === ftyp[0] && view[i+1] === ftyp[1] && view[i+2] === ftyp[2] && view[i+3] === ftyp[3]) {
      return i - 4;
    }
  }
  return -1;
}

export async function parseAppleLivePhoto(imageSrc, onProgress) {
  const buffer = await fetchWithProgress(imageSrc, onProgress);
  return unzipLivp(buffer);
}

async function unzipLivp(buffer) {
  const view = new DataView(buffer);
  const files = {};
  const eocdSignature = 0x06054b50;
  
  // 从文件末尾查找 EOCD
  let eocdOffset = -1;
  for (let i = buffer.byteLength - 22; i >= 0; i--) {
      if (view.getUint32(i, true) === eocdSignature) {
          eocdOffset = i;
          break;
      }
  }
  
  if (eocdOffset === -1) throw new Error('Invalid ZIP file');

  const cdOffset = view.getUint32(eocdOffset + 16, true);
  const totalEntries = view.getUint16(eocdOffset + 10, true);
  
  let offset = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
      if (offset >= buffer.byteLength) break;
      const signature = view.getUint32(offset, true);
      if (signature !== 0x02014b50) break;
      
      const compressionMethod = view.getUint16(offset + 10, true);
      const compressedSize = view.getUint32(offset + 20, true);
      const fileNameLength = view.getUint16(offset + 28, true);
      const extraFieldLength = view.getUint16(offset + 30, true);
      const fileCommentLength = view.getUint16(offset + 32, true);
      const localHeaderOffset = view.getUint32(offset + 42, true);
      
      const fileNameBytes = new Uint8Array(buffer, offset + 46, fileNameLength);
      const fileName = new TextDecoder().decode(fileNameBytes);
      
      offset += 46 + fileNameLength + extraFieldLength + fileCommentLength;
      
      // 读取本地文件头以定位数据开始位置
      const localNameLen = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
      const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
      
      const fileData = buffer.slice(dataStart, dataStart + compressedSize);
      let blob = null;
      
      if (compressionMethod === 0) {
          blob = new Blob([fileData]);
      } else if (compressionMethod === 8 && typeof DecompressionStream !== 'undefined') {
           try {
               const ds = new DecompressionStream('deflate-raw');
               const response = new Response(new Blob([fileData]).stream().pipeThrough(ds));
               blob = await response.blob();
           } catch (err) {
               console.warn('Decompression failed for:', fileName, err);
           }
      }
      
      if (blob) {
          if (fileName.toLowerCase().endsWith('.mov')) {
              files.video = new Blob([blob], { type: 'video/quicktime' });
          } else if (/\.(heic|jpg|jpeg|png)$/i.test(fileName)) {
              // 优先使用 heic，或者是包里的第一张图片
              if (!files.image || fileName.toLowerCase().endsWith('.heic')) {
                  const type = fileName.toLowerCase().endsWith('.heic') ? 'image/heic' : 
                               fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
                  files.image = new Blob([blob], { type });
              }
          }
      }
  }
  
  return files;
}