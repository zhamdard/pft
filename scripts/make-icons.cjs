/**
 * Generates the PNG app icons from a vector drawing (no image libraries).
 *
 * iOS ignores SVG for `apple-touch-icon` and installs a screenshot-looking
 * tile instead, which is why the home-screen icon mattered enough to draw here.
 * Renders at 4x and box-downsamples for smooth edges, then hand-encodes the PNG.
 */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const OUT_DIR = path.resolve(__dirname, '..', 'public')
const SS = 4 // supersample factor

const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
]
const INDIGO = hex('#4f46e5')
const WHITE = [255, 255, 255]

/* --- drawing primitives, in a 180x180 design space ---------------------- */

function makeCanvas(size) {
  return { size, px: new Uint8Array(size * size * 4) }
}

function inRoundedRect(x, y, rx, ry, w, h, r) {
  if (x < rx || y < ry || x >= rx + w || y >= ry + h) return false
  const cx = Math.min(Math.max(x, rx + r), rx + w - r)
  const cy = Math.min(Math.max(y, ry + r), ry + h - r)
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= r * r
}

function setPx(c, x, y, col) {
  if (x < 0 || y < 0 || x >= c.size || y >= c.size) return
  const i = (y * c.size + x) * 4
  c.px[i] = col[0]
  c.px[i + 1] = col[1]
  c.px[i + 2] = col[2]
  c.px[i + 3] = 255
}

function roundedRect(c, scale, col, rx, ry, w, h, r) {
  const X = rx * scale
  const Y = ry * scale
  const W = w * scale
  const H = h * scale
  const R = r * scale
  for (let y = Math.floor(Y); y < Math.ceil(Y + H); y += 1) {
    for (let x = Math.floor(X); x < Math.ceil(X + W); x += 1) {
      if (inRoundedRect(x + 0.5, y + 0.5, X, Y, W, H, R)) setPx(c, x, y, col)
    }
  }
}

function circle(c, scale, col, cx, cy, r) {
  const CX = cx * scale
  const CY = cy * scale
  const R = r * scale
  for (let y = Math.floor(CY - R); y <= Math.ceil(CY + R); y += 1) {
    for (let x = Math.floor(CX - R); x <= Math.ceil(CX + R); x += 1) {
      const dx = x + 0.5 - CX
      const dy = y + 0.5 - CY
      if (dx * dx + dy * dy <= R * R) setPx(c, x, y, col)
    }
  }
}

/**
 * The mark: a full-bleed indigo tile with the white wallet outline from
 * favicon.svg, simplified so it still reads at 60px on a home screen.
 * Full bleed (no transparency) also means iOS's rounded-corner mask has no
 * black corners to show.
 *
 * `mark` scales the wallet around the tile centre: 1 fills the tile (used for
 * the regular icons), ~0.68 keeps it inside the maskable safe zone so Android
 * adaptive-icon masks never clip the clasp or corners.
 */
function drawIcon(size, mark = 1, centerY = 90) {
  const scale = (size / 180) * SS
  const c = makeCanvas(size * SS)

  const fit = (rx, ry, w, h, r) => {
    const cx = rx + w / 2
    const cy = ry + h / 2
    // Vertical pivot is 101 (the wallet body's own centre), not the tile
    // centre: scaling the 11-unit gap between them keeps the stroke visually
    // centred, and only the smaller ominous gap scales with the mark.
    const w2 = w * mark
    const h2 = h * mark
    return [90 + (cx - 90) * mark - w2 / 2, centerY + (cy - 101) * mark - h2 / 2, w2, h2, r * mark]
  }

  roundedRect(c, scale, INDIGO, 0, 0, 180, 180, 0) // background
  roundedRect(c, scale, WHITE, ...fit(38, 64, 104, 74, 18)) // wallet body (outer)
  roundedRect(c, scale, INDIGO, ...fit(47, 73, 86, 56, 11)) // hollow it into an outline
  const [ccx, ccy] = [90 + (110 - 90) * mark, centerY + (101 - 101) * mark]
  circle(c, scale, WHITE, ccx, ccy, 8 * mark) // clasp

  /* Box-downsample SS x SS -> 1, which is what makes the curves smooth. */
  const out = Buffer.alloc(size * size * 4)
  const n = SS * SS
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let dy = 0; dy < SS; dy += 1) {
        for (let dx = 0; dx < SS; dx += 1) {
          const i = ((y * SS + dy) * size * SS + (x * SS + dx)) * 4
          r += c.px[i]
          g += c.px[i + 1]
          b += c.px[i + 2]
          a += c.px[i + 3]
        }
      }
      const o = (y * size + x) * 4
      out[o] = Math.round(r / n)
      out[o + 1] = Math.round(g / n)
      out[o + 2] = Math.round(b / n)
      out[o + 3] = Math.round(a / n)
    }
  }
  return out
}

/* --- minimal PNG encoder ----------------------------------------------- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typed), 0)
  return Buffer.concat([len, typed, crc])
}

function encodePng(rgba, size) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const stride = size * 4
  const raw = Buffer.alloc(size * (stride + 1))
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* --- write them out ---------------------------------------------------- */

const targets = [
  ['apple-touch-icon.png', 180, 1],
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  // Maskable icon: inset mark so OEM-shaped masks can't clip it.
  // Sized from drawIcon's own pixel measurements, not by eyeballing: a
  // mark of 0.68 with the centre left at 92 keeps clear space around the
  // wallet in the worst case (maskable-minimal shows a centred 66% crop).
  ['icon-maskable-512.png', 512, 0.68],
]

for (const [name, size, mark] of targets) {
  const png = encodePng(drawIcon(size, mark), size)
  fs.writeFileSync(path.join(OUT_DIR, name), png)
  console.log(`${name.padEnd(22)} ${size}x${size}  ${png.length} bytes`)
}
