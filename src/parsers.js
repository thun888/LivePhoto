export async function parseAndroidLivePhoto(imageSrc) {
  const response = await fetch(imageSrc);
  const buffer = await response.arrayBuffer();
  const offset = findVideoOffset(buffer);
  
  if (offset > 0) {
    return {
        video: new Blob([buffer.slice(offset)], { type: 'video/mp4' })
    };
  }
  throw new Error('No video found in Android Live Photo');
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

export async function parseAppleLivePhoto(imageSrc) {
  const response = await fetch(imageSrc);
  const buffer = await response.arrayBuffer();
  const files = await unzipLivp(buffer);
  return files;
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