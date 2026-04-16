// Generates a simple 256x256 PNG icon using pure Node (no deps)
// Draws an orange ring on dark background (mimicking MiniCircle widget)
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const SIZE = 256
const BG = [0x1a, 0x1a, 0x2e] // #1a1a2e
const ACCENT = [0xf0, 0xa0, 0x30] // #f0a030
const RING_OUTER_R = 110
const RING_INNER_R = 95

function makePng() {
  const width = SIZE
  const height = SIZE
  const cx = width / 2
  const cy = height / 2

  // RGBA raw pixel buffer
  const pixels = Buffer.alloc(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx
      const dy = y - cy
      const d = Math.sqrt(dx * dx + dy * dy)
      const i = (y * width + x) * 4

      let r, g, b, a = 255
      if (d > RING_OUTER_R) {
        // Outside the widget - fully transparent
        r = 0; g = 0; b = 0; a = 0
      } else if (d > RING_INNER_R) {
        // Ring
        r = ACCENT[0]; g = ACCENT[1]; b = ACCENT[2]
      } else {
        // Inside
        r = BG[0]; g = BG[1]; b = BG[2]
      }

      pixels[i] = r
      pixels[i + 1] = g
      pixels[i + 2] = b
      pixels[i + 3] = a
    }
  }

  // PNG encoding
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  function chunk(type, data) {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length, 0)
    const typeBuf = Buffer.from(type, 'ascii')
    const crc = Buffer.alloc(4)
    const crcVal = crc32(Buffer.concat([typeBuf, data]))
    crc.writeUInt32BE(crcVal >>> 0, 0)
    return Buffer.concat([len, typeBuf, data, crc])
  }

  function crc32(buf) {
    let c
    const table = []
    for (let n = 0; n < 256; n++) {
      c = n
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      }
      table[n] = c >>> 0
    }
    let crc = 0xffffffff
    for (let i = 0; i < buf.length; i++) {
      crc = (table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)) >>> 0
    }
    return crc ^ 0xffffffff
  }

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8       // bit depth
  ihdr[9] = 6       // color type: RGBA
  ihdr[10] = 0      // compression
  ihdr[11] = 0      // filter
  ihdr[12] = 0      // interlace

  // IDAT - add filter byte (0) at start of each scanline
  const stride = width * 4
  const rawWithFilter = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    rawWithFilter[y * (stride + 1)] = 0 // filter type 0 (none)
    pixels.copy(rawWithFilter, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const compressed = zlib.deflateSync(rawWithFilter)

  const png = Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])

  return png
}

const outDir = path.join(__dirname, '..', 'resources')
fs.mkdirSync(outDir, { recursive: true })
const outPath = path.join(outDir, 'icon.png')
fs.writeFileSync(outPath, makePng())
console.log('Generated', outPath, makePng().length, 'bytes')
