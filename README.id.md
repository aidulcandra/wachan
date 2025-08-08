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
- [Custom Programming](#custom-programming)

## Instalasi
```bash
npm install wachan
```

## Contoh
```js
const bot = require("wachan")

// Menerima pesan teks "Hello", lalu membalas "Hi"
bot.onReceive("Hello", "Hi")

// Gunakan function sebagai respon, argument pertamanya yaitu message
bot.onReceive("Hi", async (message) => {
    // Kirim pesan dengan bot.sendMessage(), id chatroom tujuan harus dimasukkan
    await bot.sendMessage(message.room, "Hiii")

    // Bisa membalas dengan message.reply(), secara otomatis meng-quote ke pesan yang diterima
    await message.reply(`Hi, ${message.sender.name}!`)

    // Bisa juga cukup dengan me-return string untuk membalas
    return `Hi, ${message.sender.name}!`
})

// Menggunakan function sebagai input, argument pertama juga berisi message. Ini bisa dipakai untuk memfilter pesan
bot.onReceive(
    (message) => message.sender.name == "Don",
    "You again"
)

// Cara kirim gambar
bot.onReceive("kirim gambar", {image: bufferGambar, text: "Caption"})
bot.onReceive("kirim gambar", {image: "url atau path ke gambar"})
bot.onReceive("send image", async (message) => {
    const image = buffer // atau url atau path
    const text = "Ini captionnya"

    // Dengan bot.sendMessage()
    await bot.sendMessage(message.room, {image, text})

    // Dengan message.reply()
    await message.reply({image, text})

    // Dan tentunya, dengan cara me-return object
    return {image, text}
})

// Menggunakan regex sebagai input
bot.onReceive(/good (morning|afternoon|evening)/i, "to you as well")

// Mengambil bagian dari teks menggunakan regex. Hasilnya akan dimasukkan ke teks output menggantikan pola <<angka/nama>>. Penomoran dimulai dari 0.
bot.onReceive(/nama saya (\w+)/, "Halo, <<0>>!")
bot.onReceive(/Saya tinggal di (?<tempat>\w+)/, "<<tempat>> itu dimana ya?")

// Jika menggunakan function sebagai output, teks yang diambil dengan regex masuk ke argument kedua dari function nya
bot.onReceive(/^translate (.+)/, async (message, captures) => {
    const translation = await translate(captures[0])
    return translation
})
bot.onReceive(/Aku adalah (?<name>\w+)/, async (message, captures) => {
    return `${captures.name} adalah nama yang keren!`
})

// Ketika wachan berhasil tersambung (dijalankan sebelum memproses pesan pending)
bot.onConnected(async () => {
    await bot.sendText(targetId, "Wachan sudah tersambung!")
})

// Ketika wachan sudah siap (dijalankan setelah memproses pesan pending)
bot.onReady(async () => {
    await bot.sendText(targetId, "Selesai membaca semua pesan yg belum dibaca!")
})

// Jalankan bot
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
- `bot.sendMessage(targetId, optionsa)` - Kirim pesan
    - `targetId` - ID chatroom tujuan
    - `options` - bisa berupa string / object
        - string: kirim pesan teks ini
        - object: lebih banyak opsi pengiriman. Lihat di [sini](#opsi-pengiriman-pesan)
- `bot.start()` - Jalankan bot.
- `bot.settings` - Pengaturan bot. Cek [di sini](#penjelasan-tiap-item-di-pengaturan)
    - `bot.settings.receiveOfflineMessages`
    - `bot.settings.save()` - Simpan pengaturan. Perlu dilakukan setelah memodifikasi settings di dalam program.
- `bot.getSocket()` - Ambil objek socket baileys.

## Function Response
Kamu bisa gunakan function sebagai respon pesan. Argument pertamanya adalah `message` dan keduanya adalah `captures` (jika ada).
```js
bot.onReceive("test", async function (message, captures) {
    // Kode di sini
})
```
### Objek Pesan (Message)
`message`: Objek pesan Wachan
- `message.room` - ID dari chatroom
- `message.sender` - Objek pengirim (sender)
    - `message.sender.id` - ID pengirim
    - `message.sender.isMe` - `true` jika pengirimnya adalah bot sendiri
    - `message.sender.name` - Username pengirim
    - `message.sender.isAdmin` - `true`/`false` jika si pengirim adalah admin/bukan admin. `null` jika pesan ini pesan pribadi. (bukan di dalam grup)
- `message.text` - Teks atau caption dari pesan
- `message.receivedOnline` - `true` jika pesan ini diterima ketika bot sedang online
- `message.reply(options)` - Balas ke pesan.
    - `options` - Bisa berupa string / object
        - string: balas dengan teks ini
        - object: lebih banyak opsi pengiriman. Lihat di [sini](#opsi-pengiriman-pesan)
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

<b>Catatan:</b> Karena `bot.sendMessage()` dan `message.reply()` normalnya me-return sebuah object message yang berisi property `text`, jadi me-return hasil dari function-function tersebut bisa membuat bot mengirim pesan 2 kali:
```js
bot.onReceive("test", async (msg) => {
    // ini akan mengirim 2 pesan
    // 1. dari efek msg.reply()
    // 2. dari hasil me-return message yg dibuat dari msg.reply()
    return await msg.reply("ok")
})
```

## Custom Programming
Kamu bisa akses item-item ini untuk memprogram fungsi tambahan sendiri.
1. Objek socket milik baileys: `bot.getSocket()`
2. Objek pesan milik baileys: `message.toBaileys()`