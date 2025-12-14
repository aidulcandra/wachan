const { randomBytes } = require('crypto')
const { writeFile, readFile, unlink } = require('fs/promises')
const { tmpdir } = require('os')
const { spawn } = require('child_process')
const { TextEncoder } = require('util')
const fileType = require('file-type')
const { fileTypeFromBuffer } = fileType
const { Image } = require('node-webpmux')
const sharp = require('sharp')

async function create(input, options = {}) {
    const id = randomBytes(32).toString('hex')

    let buffer

    if (typeof input === 'string') { 
        if (input.match(/^https?:\/\//)) { // URL
            const response = await fetch(input)
            buffer = Buffer.from(await response.arrayBuffer())
        } else { // File path
            buffer = await readFile(input)
        }
    } else if (Buffer.isBuffer(input)) { // Buffer
        buffer = input
    }

    const mime = await fileTypeFromBuffer(buffer).then(ft => ft?.mime)
    const isVideo = mime?.startsWith('video/')
    
    const mode = options?.mode?.trim()?.match(/^(crop|fit|all)$/i)?.[1]?.toLowerCase()
        || "all"

    const size = Number(options?.size) || (isVideo ? 128 : 512)
    if (isNaN(size)) throw new Error("wachan/sticker: Size must be a number".red)
    let output
    if (isVideo) {
        const tempDir = tmpdir()
        const videoPath = `${tempDir}/${id}-input`
        const webpPath = `${tempDir}/${id}-output.webp`
        await writeFile(videoPath, buffer)
        
        const o = [
            "-i", videoPath,
            "-vcodec", "libwebp"
        ]

        if (mode === "crop") o.push("-vf", "crop='min(iw,ih):ow'")
        else if (mode === "all") o.push("-vf", "format=rgba,pad='max(iw,ih):ow:-1:-1:#00000000'")
    
        o.push(
            "-s", `${size}:${size}`,
            "-vsync", "0",
            "-an",
            "-loop", "0",
            webpPath
        )

        await new Promise((resolve) => {
            const ff = spawn("ffmpeg", o)
            ff.on("close", code => {
                if (code !== 0) throw new Error(`wachan/sticker: ffmpeg exited with code ${code}`.red)
                resolve()
            })
        })
        
        output = await readFile(webpPath)
        await unlink(videoPath)
        await unlink(webpPath)
    } else {
        const animated = await fileTypeFromBuffer(buffer).then(ft => ft?.ext === 'gif')
        output = await sharp(buffer, { animated })
            .resize(size, size, { 
                fit: {
                    "crop": "cover",
                    "fit": "fill",
                    "all": "contain"
                }[mode],
                background: 'transparent',
                position: 'center'
            })
            .webp().toBuffer()
    }

    const stickerInfo = JSON.stringify({
        'sticker-pack-id': id,
        'sticker-pack-name': options?.pack || '',
        'sticker-pack-publisher': options?.author || '',
        'emojis': options?.categories || []
    })

    const exif = Buffer.concat([
        Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]),
        Buffer.from(stickerInfo, 'utf-8')
    ])

    exif.writeUIntLE(new TextEncoder().encode(stickerInfo).length, 14, 4)

    const media = new Image()
    await media.load(output)
    media.exif = exif

    return await media.save(null)
}

module.exports = { create }