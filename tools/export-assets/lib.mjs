import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export const ROOT = path.resolve(import.meta.dirname, '..', '..');
export const SOURCE_ROOT = path.join(ROOT, 'assets-src');
export const OUTPUT_ROOT = path.join(ROOT, 'apps', 'web', 'public', 'assets');
export const MANIFEST_PATH = path.join(SOURCE_ROOT, 'manifests', 'animation-manifest.json');

export function ensureDir(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Không tìm thấy manifest: ${path.relative(ROOT, MANIFEST_PATH)}`);
  }
  return readJson(MANIFEST_PATH);
}

export function relativeToRoot(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

export function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const output = Buffer.allocUnsafe(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  typeBuffer.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return output;
}

export function encodePng(width, height, rgba) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error(`Kích thước PNG không hợp lệ: ${width}x${height}`);
  }
  if (rgba.length !== width * height * 4) {
    throw new Error(`Dữ liệu RGBA không khớp kích thước ${width}x${height}`);
  }
  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    scanlines[rowStart] = 0; // filter: None; deterministic and easy to inspect.
    rgba.copy(scanlines, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // no interlace
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(scanlines, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

export function decodePng(buffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!buffer.subarray(0, 8).equals(signature)) throw new Error('File không phải PNG hợp lệ');
  let offset = 8;
  let width;
  let height;
  let bitDepth;
  let colorType;
  let interlace;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
  }
  if (!width || !height) throw new Error('PNG thiếu IHDR');
  if (bitDepth !== 8 || interlace !== 0) throw new Error('Chỉ hỗ trợ PNG 8-bit không interlace');
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`PNG color type ${colorType} chưa được hỗ trợ`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const rowBytes = width * channels;
  const stride = rowBytes + 1;
  if (raw.length < stride * height) throw new Error('PNG IDAT bị thiếu dữ liệu');
  const decoded = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * stride];
    const row = raw.subarray(y * stride + 1, y * stride + 1 + rowBytes);
    const outOffset = y * rowBytes;
    const priorOffset = (y - 1) * rowBytes;
    for (let x = 0; x < rowBytes; x += 1) {
      const left = x >= channels ? decoded[outOffset + x - channels] : 0;
      const up = y > 0 ? decoded[priorOffset + x] : 0;
      const upLeft = y > 0 && x >= channels ? decoded[priorOffset + x - channels] : 0;
      const value = row[x];
      if (filter === 0) decoded[outOffset + x] = value;
      else if (filter === 1) decoded[outOffset + x] = (value + left) & 255;
      else if (filter === 2) decoded[outOffset + x] = (value + up) & 255;
      else if (filter === 3) decoded[outOffset + x] = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) decoded[outOffset + x] = (value + paeth(left, up, upLeft)) & 255;
      else throw new Error(`PNG filter ${filter} chưa được hỗ trợ`);
    }
  }
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const source = i * channels;
    const target = i * 4;
    if (colorType === 6) decoded.copy(rgba, target, source, source + 4);
    else if (colorType === 2) {
      rgba[target] = decoded[source]; rgba[target + 1] = decoded[source + 1]; rgba[target + 2] = decoded[source + 2]; rgba[target + 3] = 255;
    } else if (colorType === 0) {
      rgba[target] = decoded[source]; rgba[target + 1] = decoded[source]; rgba[target + 2] = decoded[source]; rgba[target + 3] = 255;
    } else {
      rgba[target] = decoded[source]; rgba[target + 1] = decoded[source]; rgba[target + 2] = decoded[source]; rgba[target + 3] = decoded[source + 1];
    }
  }
  return { width, height, rgba };
}

export function readPng(filePath) {
  return decodePng(fs.readFileSync(filePath));
}

export function writePng(filePath, width, height, rgba) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, encodePng(width, height, rgba));
}

export function fillRect(target, targetWidth, x, y, source) {
  for (let row = 0; row < source.height; row += 1) {
    const sourceOffset = row * source.width * 4;
    const targetOffset = ((y + row) * targetWidth + x) * 4;
    source.rgba.copy(target, targetOffset, sourceOffset, sourceOffset + source.width * 4);
  }
}

export function sortedFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).sort((a, b) => a.localeCompare(b));
}
