[English](README.md) | Bahasa Indonesia

# wachan
Cara yang lebih simpel untuk meng-kode baileys.

## Daftar Isi
- [Instalasi](#instalasi)
- [Contoh](#contoh)
- [File Pengaturan](#file-pengaturan)
    - [Pengaturan Awal](#pengaturan-awal)
    - [Penjelasan](#penjelasan-tiap-item-di-pengaturan)
- [Objek Bot](#objek-bot)
- [Function Response](#function-response)
    - [Objek Message](#objek-pesan-message)
    - [Captures](#captures)
    - [Value Yang Di Return](#value-yang-di-return)
- [Opsi Pengiriman Pesan](#opsi-pengiriman-pesan)
- [Tools](#tools)
    - [Commands](#commands-tool-requirewachancommands)
    - [Sticker](#sticker-tool-requirewachansticker)
- [Custom Programming](#custom-programming)
- [Changelog](#changelog)

## Instalasi
```bash
npm install wachan
```

## Contoh
3 jenis input:
```javascript
const bot = require("wachan")

// 1) Input string: Deteksi pesan masuk yang punya teks persis dengan string
bot.onReceive("Hello", "Hi")

// 2) Input regex: Deteksi pesan masuk yang punya pola regex tersebut
bot.onReceive(/selamat (pagi|siang|sore|malam)/i, "halo")

// 3) Input function: Deteksi pesan jika hasil fungsinya true. (Fungsi filter pesan)
bot.onReceive((msg)=>msg.sender.id===OWNER_ID, "hello boss")
```

3 Jenis respon:
```js
// 1) Respon string: Balas dengan pesan teks
bot.onReceive("Marco", "Polo")

// 2) Respon object: Lebih banyak opsi pengiriman
bot.onReceive("kirim gambar", {image:"buffer, url, atau path", caption:"Ini caption-nya"})
bot.onReceive("kirim video", {video:"...", caption:"..."})
bot.onReceive("kirim gif", {gif:"...", caption:"..."}) // file harus berupa video agar bisa bergerak (whatsapp tidak support file gif)
bot.onReceive("kirim audio", {audio:"..."})
bot.onReceive("kirim sticker", {sticker:"..."}) // file WebP

// 3) Respon function: Custom script
bot.onReceive("test", async (message, captures, group) => {
    const options = {...}

    // 3 cara mengirim pesan:
    // 1) Dengan bot.sendMessage()
    await bot.sendMessage(TARGET_ID, "string untuk pesan teks")
    await bot.sendMessage(TARGET_ID, options) // lebih banyak opsi pengiriman

    // 2) Dengan message.reply()
    await message.reply("string untuk pesan teks")
    await message.reply(options) // lebih banyak opsi pengiriman

    // 3) Me-return value (sama dengan message.reply)
    return "string untuk pesan teks"
    return options // lebih banyak opsi pengiriman
})
```

Event-event lain:
```js
// Ketika Wachan berhasil tersambung (diproses SEBELUM memproses pesan offline)
bot.onConnected(async () => {
    await bot.sendText(targetId, "Wachan sudah terhubung!")
})

// Ketika Wachan sudah siap (diproses SETELAH memproses pesan offline)
bot.onReady(async () => {
    await bot.sendText(targetId, "Selesai membaca semua pesan offline!")
})
```

Menjalankan bot:
```js
bot.start()
```

## File Pengaturan
### Pengaturan Awal
Saat pertama bot dijalankan, file pengaturan awal akan dibuat jika tidak ada.
```json
{
  "receiveOfflineMessages": true,
  "defaultBotName": "Wachan"
}
```
Pengaturan ini bisa diubah ketika bot berjalan dengan cara mengakses `bot.settings`. Untuk menyimpan perubahan supaya tetap berlaku ketika bot dijalankan berikutnya, gunakan `bot.settings.save()`.

#### Penjelasan tiap item di pengaturan:
- `receiveOfflineMessages`: Jika `true`, maka akan memproses pesan offline (pesan yang masuk ketika bot sedang off). Pesan yang dimaksud adalah yang dituliskan pada `bot.onReceive`.
- `defaultBotName`: Nama ini akan digunakan jika pesan bot sendiri tidak memiliki `message.sender.name`

## Objek Bot
Ini objek-objek yang di-export oleh wachan:<br><br>
`bot`: Objek bot wachan
- `bot.onConnected(callback)` - Menambahkan function yang akan dijalankan ketika wachan berhasil terkoneksi ke whatsapp, <b>sebelum</b> memproses pesan offline.
- `bot.onReady(callback)` - Menambahkan function yang akan dijalankan ketika bot sudah siap. Dijalankan <b>setelah</b> memproses pesan offline.
- `bot.onReceive(input, response)` - Menambahkan receiver (penerima pesan) yang akan merespon ke pesan yg ditentukan oleh input.
    - `input`: bisa berupa string, regex, atau function.
        - string: akan mencocokkan teks yang persis pada isi pesan
        - regex: akan mencocokkan pola teks pada isi pesan
        - function, `input(message)`: akan memfilter pesan berdasarkan value yang di-return
    - `response`: bisa berupa string, object, atau function.
        - string: balas (dan meng-quote) pesan yang diterima dengan teks
        - object: balas (dan meng-quote) pesan yang diterima dengan data dari object-nya. Lihat [di sini](#opsi-pengiriman-pesan)
        - function: `response(message, captures)`, jalankan fungsi. [Penjelasan](#function-response)
    - me-return: sebuah objek `Receiver`. Receiver ini bisa dihapus dengan cara `receiver.remove()` untuk menghentikan respon yg dilakukannya.
- `bot.waitForMessage(input, timeout)` - Menunggu munculnya pesan masuk sesuai input lalu me-return pesan tersebut.
    - `input`: Sama seperti `input` di `bot.onReceive()` di atas.
    - `timeout`: Batas waktu tunggu. Jika tidak ditemukan pesan dan waktu habis, `waitForMessage()` akan me-return `undefined`.
- `bot.sendMessage(targetId, optionsa)` - Kirim pesan
    - `targetId` - ID chatroom tujuan
    - `options` - bisa berupa string / object
        - string: kirim pesan teks ini
        - object: lebih banyak opsi pengiriman. Lihat di [sini](#opsi-pengiriman-pesan)
- `bot.getGroupData(jid)` - Dapatkan informasi tentang grup.
- `bot.start()` - Jalankan bot.
- `bot.settings` - Pengaturan bot. Cek [di sini](#penjelasan-tiap-item-di-pengaturan)
    - `bot.settings.receiveOfflineMessages`
    - `bot.settings.defaultBotName`
    - `bot.settings.save()` - Simpan pengaturan. Perlu dilakukan setelah memodifikasi settings di dalam program.
- `bot.getSocket()` - Ambil objek socket baileys.

## Function Response
Kamu bisa gunakan function sebagai respon pesan. Argument pertamanya adalah `message`, kedua `captures` (jika ada), dan ketiga `group` (jika chat room tempat pesan diterima adalah grup).
```js
bot.onReceive("test", async function (message, captures, group) {
    // Kode di sini
})
```
### Objek Pesan (Message)
`message`: Objek pesan Wachan
- `message.id` - ID dari objek pesan ini
- `message.room` - ID dari chatroom
- `message.sender` - Objek pengirim (sender)
    - `message.sender.id` - ID pengirim (berupa format `nomor-telepon@s.whatsapp.net`)
    - `message.sender.lid` - LID pengirim (id tersembunyi untuk tiap user Whatsapp, dalam format `nomoracak@lid`)
    - `message.sender.isMe` - `true` jika pengirimnya adalah bot sendiri
    - `message.sender.name` - Username pengirim
    - `message.sender.isAdmin` - `true`/`false` jika si pengirim adalah admin/bukan admin. `null` jika pesan ini pesan pribadi. (bukan di dalam grup)
- `message.timestamp` - Timestamp dari pesan ini dalam format Unix Timestamp.
- `message.type` - Jenis dari pesan ini. Bisa berupa: `"text"`, `"image"`, `"video"`, `"gif"`, `"audio"`, `"sticker"`, atau `"document"`
- `message.isMedia` - `true` jika pesan ini adalah pesan media (type = `"image"`, `"video"`, `"gif"`, `"audio"`, `"sticker"`, atau `"document"`)
- `message.text` - Teks atau caption dari pesan
- `message.receivedOnline` - `true` jika pesan ini diterima ketika bot sedang online
- `message.reply(options)` - Balas ke pesan.
    - `options` - Bisa berupa string / object
        - string: balas dengan teks ini
        - object: lebih banyak opsi pengiriman. Lihat di [sini](#opsi-pengiriman-pesan)
- `message.react(emoji)` - Kirim reaction ke pesan ini
    - `emoji` - String berisi 1 emoji untuk dijadikan reaction
- `message.getQuoted()` - Me-return pesan yang di-quote oleh pesan ini.
- `message.toBaileys()` - Me-return objek message asli dari modul baileys

### Captures
Argument kedua adalah `captures` yaitu objek <b>(bukan array)</b> yang berisi string teks-teks yang diambil (di-capture) dengan regex. Jika tidak ada, maka objek-nya kosong.

Key dari objek nya tergantung pada regex-nya. Jika menggunakan capturing biasa dengan tanda kurung, maka hasilnya tersimpan pada key berupa angka (mulai dari 0). Jika menggunakan <i>named capture</i>, maka key-nya berupa string.

Regex Input|Teks yg diterima|Objek `captures`
-|-|-
`/Nama saya (\S+)\. Saya tinggal di (\S+)\./` | `"Nama saya Wachan. Saya tinggal di NPM.` | `{"0":"Wachan", "1":"NPM"}`
`/Nama saya (?<nama>\S+)\. Saya tinggal di (?<lokasi>\S+)\./` | `"Nama saya Wachan. Saya tinggal di NPM.` | `{"nama":"Wachan", "lokasi":"NPM"}`
<hr>

`captures.toArray()` bisa digunakan untuk mengubah objek `captures` ke array (agar bisa melakukan operasi array)

### Group
Argumentt kedua adalah `group`, objek yang berisi informasi tentang grup. Nilainya `null` jika pesan dikirim ke pesan pribadi.
- `group`
    - `group.id` - ID grup (sama dengan `message.room`)
    - `group.subject` - Subject (judul) grup
    - `group.description` - Deskripsi grup
    - `group.getParticipants()` - Ambil list peserta grup berupa array berisi objek-objek dengan struktur berikut:
        - `participant`
            - `participant.id` - ID peserta. Bisa berupa JID atau LID
            - `participant.lid` - LID peserta
    - `group.getAdmins()` - Ambil list khusus admin grup
    - `group.getMembers()` - Ambil list khusus member (bukan admin)

### Value Yang Di-Return
Di dalam function response, kamu bisa me-return string/object:
- string: Membalas pesan yg diterima dengan teks ini.<br>Contoh:
```js
bot.onReceive("test", async () => {
    const a = "bro"
    return `Hello, ${a}!`
})

bot.onReceive("test", async (msg) => `Hello, ${msg.sender.name}!`)
```
- object: Bisa ditambahkan opsi lain.<br>Contoh:
```js
bot.onReceive("test", async () => {
    return {text: "Text"}
})
```

## Opsi Pengiriman Pesan
Kesimpulannya, ada 4 cara mengirim pesan:
1. Menggunakan `bot.sendMessage(targetId, options)`
2. Menggunakan object di parameter kedua function `bot.onReceive(input, response)`, yaitu `response`.
3. Menggunakan `message.reply(options)`
4. Me-return object di dalam function response

Jika object-nya adalah string, maka pesan akan dikirim dalam bentuk teks. Tetapi jika berupa object dengan property-property di dalamnya, maka struktur object yang di-support adalah seperti berikut:
- `options` - Opsi pengiriman pesan
    - `options.text` - Text/caption yang akan dikirim
    - `options.quoted` - Pesan yang akan di-quote. Secara otomatis di-set ke pesan yang diterima (jika menggunakan cara 2, 3, 4). Bisa diganti maupun di-set ke `null`.
    - `options.image` - Gambar yang akan dikirim. Bisa berupa buffer, url, maupun path.
    - `options.video` - Video yang akan dikirim. Bisa berupa buffer, url, maupun path.
    - `options.gif` - Video yang akan dikirim sebagai GIF. Bisa berupa buffer, url, maupun path. (Whatsapp tidak support file GIF, jika kamu menggunakan file GIF, maka tidak akan bergerak gambarnya)
    - `options.audio` - Audio yang akan dikirim. Bisa berupa buffer, url, maupun path.
    - `options.sticker` - File WebP yang akan dikirim sebagai stiker (buffer/url/path)
    - `options.document` - File yang akan dikirim sebagai pesan document. Pengaturan tambahan:
        - `options.mimetype` - Mimetype dari file ini.
        - `options.fileName` - Nama file yang ditampilkan untuk pesan document ini.

<b>Catatan:</b> Karena `bot.sendMessage()` dan `message.reply()` normalnya me-return sebuah object message yang berisi property `text`, jadi me-return hasil dari function-function tersebut bisa membuat bot mengirim pesan 2 kali:
```js
bot.onReceive("test", async (msg) => {
    // ini akan mengirim 2 pesan
    // 1. dari efek msg.reply()
    // 2. dari hasil me-return message yg dibuat dari msg.reply()
    return await msg.reply("ok")
})
```

## Tools
Kamu bisa import tools Yang berguna di berbagai skenario.
### Commands Tool `require("wachan/commands")`
Berguna untuk membuat command (perintah) yang berformat prefix-command-param yang populer di kalangan developer bot whatsapp. Contoh: `/search article`
<br>
Meng-export: `commands`
- `commands` - Commands Tool. Ketika diimport, akan otomatis menambah satu item pengaturan baru, `bot.settings.commandPrefixes`, yaitu array dari prefix-prefix yang bisa digunakan untuk menjalankan command.
    - `commands.add(name, response, options)` - Tambah command baru
        - `name` - Nama command-nya
        - `response` - String/Object/Function
            - sebagai string: Balas ke pesan command dengan teks
            - sebagai object: Lebih banyak opsi pengiriman. [Cek di sini](#opsi-pengiriman-pesan)
            - sebagai function: `response(message, params, command, prefix, group, bot)`
                - `message` - Pesan perintah
                - `params` - Parameter. Contoh: `/test a b c` -> params = ["a","b","c"]
                - `command` - Nama command yang digunakan.
                - `prefix` - Prefix yang digunakan
                - `group` - Info tentang grup dimana perintah ini dijalankan
                - `bot` - Objek bot yang sama dengan export utama wachan
        - `options` - Opsi tambahan untuk command ini
            - `options.aliases` - Array alias untuk alternatif perintah
            - `options.separator` - Karakter yang akan digunakan sebagai pemotong string parameter. Default spasi (`" "`)
            - `options.description` - Deskripsi command
            - `options.sectionName` - Nama section dari command ini. Ini digunakan untuk men-generate menu. (lihat di bawah di bagian `commands.generateMenu()`)
            - `options.hidden` - Command ini tidak akan ditampilkan di menu dari hasil `commands.generateMenu()`
    - `commands.fromFile(commandName, filePath)` - Tambah command baru dari file. File-nya harus berekstensi `.js` dan dari file tersebut di-export objek `cmdFile` dengan struktur seperti berikut:
        - `cmdFile.response` - Mirip dengan parameter `response` pada `commands.add()`. Lihat di atas.
        - `cmdFile.options` - Opsional. Mirip dengan parameter `options` pada `commands.add()`. Lihat di atas.
    - `commands.addPrefix(prefix)` - Menambahkan prefix
    - `commands.removePrefix(prefix)` - Menghapus salah satu prefix yang ada.
    - `commands.getCommandInfo(commandName)` - Ambil info tentang suatu command yang sudah terdaftar.
    - `commands.getCommands()` - Ambil info semua command yang sudah terdaftar.
    - `commands.generateMenu(options)` - Generate sebuah string berisi menu perintah yang otomatis berisi list perintah dan dikelompokkan berdasarkan section-nya. Opsi Generation:
        -   `options?.prefix` - Prefix yang akan ditampilkan. Secara default, prefix pertama di daftar prefix.
        - `options?.header` - Judul menu. Catatan: Kamu perlu menambahkan newlines (`\n`) secara manual di ujunnya jika ingin memisahkan judul dan isi di baris berbeda. Secara default: `"> COMMAND LIST:\n\n"`
        - `options?.sectionTitleFormat` - Gunakan ini untuk formatting judul tiap section. Gunakan `<<section>>` untuk menandai posisi teks nama section. Secara default: `"# <<section>>\n"` (Sama seperti tadi, tambahkan newline secara manual)
        - `options?.sectionFooter` - Footer (bagian bawah/penutup) dari tiap section. Sekali lagi, newline perlu ditambahkan secara manual tetapi di awal. (Contoh: `"\n------"`). Secara default: `""` (string kosong)
        - `options?.commandFormat` - Formatting dari setiap butir command. Gunakan `<<prefix>>`, `<<name>>`, dan `<<description>>` untuk menandai posisi prefix, nama command, dan deskripsi command. Secara default: ``"- `<<prefix>><<name>>`: <<description>>"``
        - `options?.commandSeparator` - Pemisah tiap item command. Secara default: `"\n"` (newline)
        - `options?.sectionSeparator` - Pemisah antar section. Secara default: `"\n\n"`
        - `options?.unsectionedFirst` - Jika `true` akan menampilkan command tanpa section lebih dulu, setelah itu command yang ada sectionnya. Jika `false` maka sebaliknya.
        - `options?.noDescriptionPlaceholder` - String yang akan digunakan jika command tidak punya deskripsi.

        Ini contoh string yang digenerate jika menggunakan formatting default:
```
> COMMAND LIST:

# Section A
- `/cmd1`: Description of the command.
- `/hello`: Say hello.
- `/wachan`: Awesome module.

# Section B
- `/this`: Is an example
- `/you`: Can imagine what it looks like in Whatsapp, I suppose.
- `/nodesc`: No description
```

Contoh Penggunaan:
```js
const cmd = require("wachan/commands")
cmd.add("multiply", function (msg, params) {
    const [a, b] = params
    const result = Number(a) * Number(b)
    return `The result of ${a}*${b} is ${result}`
})

// Akan merespon ketika ada yang mengetik:
// /multiply 4 5
// Bot akan mengalikan 4 and 5 lalu mengirimkan hasilnya di chat.
```

### Sticker Tool `require("wachan/sticker")`
Kamu bisa gunakan ini untuk membuat sticker WebP yang siap pakai di WhatsApp.
<br>Exports: `sticker`
<br><br>`sticker` - Sticker tool
- `sticker.create(input, options)` - Buat stiker WebP dari input.
    - `input` - Bisa string URL atau path, atau buffer gambar/video
    - `options` - Opsi tambahan
        - `options.pack` - Nama pack dari stiker ini. Bisa dilihat di bagian bawah jendela preview stiker di WhatsApp.
        - `options.author` - Nama author dari stiker ini. Bisa dilihat di bagian bawah jendela preview stiker di WhatsApp.
        - `options.mode` - Mode bagaimana gambar dimuat:
            - `"crop"` - Crop / potong pinggir stiker sehingga menjadi persegi.
            - `"fit"` - Tarik atau rapatkan stiker sehingga muat menjadi persegi.
            - `"all"` - Tidak ada perubahan, muat semua bagian gambar dengan cara zoom out.

Contoh:
```js
const st = require("wachan/sticker")

const input = "url atau path gambar" // atau buffer

const sticker = await st.create(input, {
    pack: "My stickers",
    author: "Me",
    mode: "crop"
})

await bot.sendMessage(targetRoom, { sticker })
```

## Custom Programming
Kamu bisa akses item-item ini untuk memprogram fungsi tambahan sendiri.
1. Objek socket milik baileys: `bot.getSocket()`
2. Objek pesan milik baileys: `message.toBaileys()`
3. `bot.start({ suppressBaileysLogs: false })` untuk menampilkan logs dari baileys di console

<hr>
<br>
<br>

# Changelog

## [Belum Rilis]
### Ditambahkan
- `bot.getGroupData(jid)`
- `message.id`
- `commands.getCommands()`

## [1.10.0] - 2025-10-26
### Ditambahkan
- `message.react()`
- Tambah Sticker Tool: `require("wachan/sticker")`
- Argument ketiga di dalam fungsi respon, `group`
- Argument kelima dan keenam di dalam fungsi respon untuk command, `group` dan `bot`
- Opsi baru untuk registrasi command: `options.hidden`
### Diperbaiki
- Fix `message.downloadMedia(saveTo)` error jika menyediakan path file yang tidak ada

## [1.9.0] - 2025-10-19
### Ditambahkan
#### Tool Commands (`require("wachan/commands")`)
- Tambah `commands.fromFile()` dan `commands.fromFolder()`
- Tambah `commands.getCommandInfo()` dan `commands.generateMenu()`

## [1.8.0] - 2025-09-08
### Ditambahkan
- Tambah fitur Message Store. Ini akan menyimpan sementara pesan yang diterima. Bisa diatur batas penyimpanannya di settings. Penyimpanan ini berguna untuk memperbaiki beberapa bug yang memerlukan untuk pesan dipanggil kembali.
- Tambah pengaturan `bot.settings.messageStoreSize` (default: 1000)
- Tambah fitur `bot.waitForMessage()`
- Tambah fitur `message.timestamp` 
- Tambah fitur `message.sender.lid`
- Tambah fitur `message.getQuoted()`
- Tambah tool Commands `require("wachan/commands")`
### Diperbaiki
- Update Baileys ke versi `6.7.19`
- `message.receivedOnline` sekarang sudah bisa bernilai `false`

## [1.7.0] - 2025-08-23
### Ditambahkan
- Support pesan sticker
- Support pesan document
- `bot.onReceive()` sekarang me-return objek `Receiver`.
- Objek `Receiver` yang dibuat dari `bot.onReceive()` bisa dihapus dengan method `.remove()`.
### Diperbaiki
- Mengirim ke id @lid tidak lagi menyebabkan error

## [1.6.0] - 2025-08-12
### Ditambahkan
- Support pesan video
- Support pesan gif
- Support pesan audio
