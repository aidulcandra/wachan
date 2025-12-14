[English](README.md) | Bahasa Indonesia

# wachan
Cara yang lebih simpel untuk meng-kode baileys.

## Peringatan Deprecation
Pada versi major berikutnya, semua fungsi respon (termasuk untuk command) akan disederhanakan sehingga memiliki 2 parameter saja:
- `context` - Ini akan berisi: `message`, `captures`, dan `command`
- fungsi `next`

Penjelasan selengkapnya [di sini](#function-response)

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
    - [Mention User](#mention-user)
    - [Data Grup](#data-grup)
- [Alur Receiver](#alur-receiver)
- [Enum Tipe Message](#enum-tipe-message)
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
4 jenis input:
```javascript
const bot = require("wachan")

// 1) Input string: Deteksi pesan masuk yang punya teks persis dengan string
bot.onReceive("Hello", "Hi")

// 2) Input regex: Deteksi pesan masuk yang punya pola regex tersebut
bot.onReceive(/selamat (pagi|siang|sore|malam)/i, "halo")

// 3) Input function: Deteksi pesan jika hasil fungsinya true. (Fungsi filter pesan)
bot.onReceive((msg)=>msg.sender.id===OWNER_ID, "hello boss")

// 4) Input enum:
bot.onReceive(bot.messageType.video, "Pesan video diterima!")
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
bot.onReceive("test", async (context, next) => {
    // argument v1: message, captures, group, next

    const { message, captures } = context
    const options = {...} // Contoh

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
    - `input`: bisa berupa string, regex, function, atau enum.
        - string: akan mencocokkan teks yang persis pada isi pesan
        - regex: akan mencocokkan pola teks pada isi pesan
        - function, `input(message)`: akan memfilter pesan berdasarkan value yang di-return
        - enum: cek `bot.messageType` untuk tipe-tipe yang ada:
            `any`, `nonmedia`, `media`, `text`, `reaction`, `image`, `video`, `gif`, `audio`, `sticker`, `document`
    - `response`: bisa berupa string, object, atau function.
        - string: balas (dan meng-quote) pesan yang diterima dengan teks
        - object: balas (dan meng-quote) pesan yang diterima dengan data dari object-nya. Lihat [di sini](#opsi-pengiriman-pesan)
        - function: `response(message, captures)`, jalankan fungsi. [Penjelasan](#function-response)
    - me-return: sebuah objek `Receiver`. Receiver ini bisa dihapus dengan cara `receiver.remove()` untuk menghentikan respon yg dilakukannya.
- `bot.onError(response)` - Tambahkan fungsi yang akan dieksekusi ketika error.
    - `response` - Fungsi yang akan dijalankan, `response(error, context)`.
        - `error` - Objek error.
        - `context` - Objek yang berisi argument-argument dari fungsi respon:
            - `message`
            - `captures`
            - `groupChat`  (deprecated. gunakan `bot.getGroupData(id)`)
- `bot.waitForMessage(input, timeout)` - Menunggu munculnya pesan masuk sesuai input lalu me-return pesan tersebut.
    - `input`: Sama seperti `input` di `bot.onReceive()` di atas.
    - `timeout`: Batas waktu tunggu. Jika tidak ditemukan pesan dan waktu habis, `waitForMessage()` akan me-return `undefined`.
- `bot.sendMessage(targetId, optionsa)` - Kirim pesan
    - `targetId` - ID chatroom tujuan
    - `options` - bisa berupa string / object
        - string: kirim pesan teks ini
        - object: lebih banyak opsi pengiriman. Lihat di [sini](#opsi-pengiriman-pesan)
- `bot.getGroupData(jid)` - Dapatkan informasi tentang grup.
- `bot.getUserData(id)` - Dapatkan data dari user dari JID / LID nya, jika bot sudah menyimpannya.
- `bot.start(options)` - Jalankan bot. Options:
    - `suppressBaileysLog` - Default `true`. Jika `true`, maka senyapkan log baileys di console.
    - `phoneNumber` - String berisi nomor telepon (dengan kode negara, tanpa simbol dan spasi) untuk langsung menghubungkan ke nomor tersebut tanpa perlu diinput lagi di console.
    - `configOverrides` - Objek config untuk meng-override (mengganti) konfigurasi pada fungsi makeWASocket dari baileys
- `bot.settings` - Pengaturan bot. Cek [di sini](#penjelasan-tiap-item-di-pengaturan)
    - `bot.settings.receiveOfflineMessages`
    - `bot.settings.defaultBotName`
    - `bot.settings.save()` - Simpan pengaturan. Perlu dilakukan setelah memodifikasi settings di dalam program.
- `bot.getSocket()` - Ambil objek socket baileys.
- `bot.messageType` - Berisi enum untuk filter di receiver. Lihat di [sini](#enum-tipe-message)

## Fungsi Respon
Kamu bisa gunakan fungsi sebagai respon. Argument pertama adalah `context` dan kedua adalah fungsi `next` (cek [Alur Receiver](#alur-receiver)).
<br><br>Sebelumnya, argumen pertama adalah `message`, kedua adalah `captures` (jika ada), ketiga `group` (jika chat roomnya berupa grup chat), dan terakhir fungsi `next`. (Ini sudah deprecated. Kedepannya `message` dan `captures` akan masuk ke dalam `context`).

```js
bot.onReceive("test", async function (context, next) {
    // const { message, captures } = context
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
- `message.type` - Jenis dari pesan ini. Bisa berupa: `"text"`, `"image"`, `"video"`, `"gif"`, `"audio"`, `"sticker"`, `"document"`, `"reaction"`, `"buttons"`, `"buttonReply"`, `"contacts"`, `"poll"`, atau `"vote"`
- `message.isMedia` - `true` jika pesan ini adalah pesan media (type = `"image"`, `"video"`, `"gif"`, `"audio"`, `"sticker"`, atau `"document"`)
- `message.downloadMedia(saveTo)` - Download media sebagai buffer. Jika path disediakan di parameter `saveTo`, maka filenya akan disimpan di situ.
- `message.text` - Teks atau caption dari pesan
- `message.reaction` - Informasi tentang reaction, jika ini adalah pesan reaction
    - `message.reaction.emoji` - Emoji yang digunakan
    - `message.reaction.key` - Objek key dari pesan yang di-react
- `message.buttons` - Objek button. Sama seperti property `buttons` yang dibuat ketika mengirim pesan button ([cek di sini](#opsi-pengiriman-pesan))
- `message.title` - Judul pesan untuk pesan buttons
- `message.footer` - Footer pesan untuk pesan buttons
- `message.buttonReply` - Informasi tentang button yang diketuk
    - `message.buttonReply.id` - ID yang diberikan ke button
    - `message.buttonReply.text` - Teks yang tertulis di atas button
    - `message.buttonReply.pos` - Posisi button (yang pertama adalah 0)
- `message.poll` - Informasi polling, jika ini adalah pesan polling
    - `message.poll.title` - Judul polling
    - `message.poll.options` - List opsi polling dalam array
    - `message.poll.multiple` - `true` jika di polling ini bisa memilih lebih dari satu opsi
    - `message.poll.votes` - Objek berisi opsi vote dan id dari voter-voter nya. Contoh: `{"opsi1":["1234@lid", "2345@lid"]}`
- `message.vote` - Informasi tentang perubahan polling (pengirim pesan melakukan voting/unvoting)
    - `message.vote.pollId` - ID dari pesan polling nya
    - `message.vote.list` - List opsi yang menjadi pilihan. Bisa juga berupa array kosong karena hasil dari unvoting.
- `message.contacts[]` - List kontak yang dikirim jika ini adalah pesan kontak
    - `contact.name` - Nama kontak
    - `contact.number` - Nomor telepon kontak
- `message.receivedOnline` - `true` jika pesan ini diterima ketika bot sedang online
- `message.reply(options)` - Balas ke pesan.
    - `options` - Bisa berupa string / object
        - string: balas dengan teks ini
        - object: lebih banyak opsi pengiriman. Lihat di [sini](#opsi-pengiriman-pesan)
- `message.react(emoji)` - Kirim reaction ke pesan ini
    - `emoji` - String berisi 1 emoji untuk dijadikan reaction. Gunakan string kosong untuk menghapus reaction.
- `message.delete()` - Hapus pesan ini. Note: Bot harus menjadi admin sebelum menghapus pesan-pesan yang ada di grup.
- `message.getQuoted()` - Me-return pesan yang di-quote oleh pesan ini. `null` jika tidak ada.
- `message.toBaileys()` - Me-return objek message asli dari modul baileys

### Captures
`captures` yaitu objek <b>(bukan array)</b> yang berisi string teks-teks yang diambil (di-capture) dengan regex. Jika tidak ada, maka objek-nya kosong.

Key dari objek nya tergantung pada regex-nya. Jika menggunakan capturing biasa dengan tanda kurung, maka hasilnya tersimpan pada key berupa angka (mulai dari 0). Jika menggunakan <i>named capture</i>, maka key-nya berupa string.

Regex Input|Teks yg diterima|Objek `captures`
-|-|-
`/Nama saya (\S+)\. Saya tinggal di (\S+)\./` | `"Nama saya Wachan. Saya tinggal di NPM.` | `{"0":"Wachan", "1":"NPM"}`
`/Nama saya (?<nama>\S+)\. Saya tinggal di (?<lokasi>\S+)\./` | `"Nama saya Wachan. Saya tinggal di NPM.` | `{"nama":"Wachan", "lokasi":"NPM"}`
<hr>

`captures.toArray()` bisa digunakan untuk mengubah objek `captures` ke array (agar bisa melakukan operasi array)

### Group
Argumentt kedua adalah `group`, objek yang berisi informasi tentang grup. Nilainya `null` jika pesan dikirim ke pesan pribadi. (Sudah deprecated sebagai argument ketiga dari response function. Kamu bisa dapatkan objek ini lewat `bot.getGroupData(id)`)

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
    - `options.buttons[]` - Array berisi button (tombol-tombol). Setiap button memiliki property berikut.
        - `button.type` - Jenis button: `reply`, `list`, `url`, `copy`, `call`.
        - `button.text` - Teks button. Wajib untuk button jenis `reply`, `url`, `copy`, dan `call`.
        - `button.id` - ID button. Wajib untuk button jenis `reply`.
        - `button.url` - URL yang akan dikunjungi ketika button diketuk. Wajib untuk button jenis `url`.
        - `button.code` - Kode yang akan dicopy ke keyboard ketika button diketuk. Wajib untuk button jenis `copy`.
        - `button.phoneNumber` - Nomor yang akan dihubungi ketika button diketuk. Wajib untuk button jenis `call`.
        - `button.title` - Judul menu list yang dimunculkan dari button jenis `list`.
        - `button.sections[]` - Array berisi section dari menu list. Wajib untuk button jenis `list`. Setiap elemennya adalah objek `section`:
            - `section.title` - Judul section
            - `section.rows[]` - Array dari list item. Wajib ada di dalam section. Setiap elemennya adalah objek `row`:
                - `row.id` - ID dari item. Wajib ada.
                - `row.title` - Judul dari item. Wajib ada.
                - `row.description` - Deskripsi item.
                - `row.header` - Teks header dari item.
    - `options.title` - Judul untuk pesan yang ber-button.
    - `options.footer` - Tulisan kaki (footer) untuk pesan yang ber-button.
    - `options.contacts[]` - Array berisi kontak. Tiap elemennya adalah objek `contact`:
        - `contact.name` - Nama kontak yang ditampilkan.
        - `contact.number` - Nomor kontak dalam string.
    - `options.poll` - Objek poll untuk mengirim polling
        - `options.poll.options[]` - Array berisi string dari opsi-opsi polling
        - `options.poll.title` - Judul dari polling
        - `options.poll.multiple` - Jika true, maka bisa memilih lebih dari 1 opsi

<b>Catatan:</b> Karena `bot.sendMessage()` dan `message.reply()` normalnya me-return sebuah object message yang berisi property `text`, jadi me-return hasil dari function-function tersebut bisa membuat bot mengirim pesan 2 kali:
```js
bot.onReceive("test", async (msg) => {
    // ini akan mengirim 2 pesan
    // 1. dari efek msg.reply()
    // 2. dari hasil me-return message yg dibuat dari msg.reply()
    return await msg.reply("ok")
})
```

### Mention User
Untuk me-mention user, kamu bisa tambahkan `@<user-lid>` di dalam teks pesanmu (tanpa `@lid`). Contoh: `msg.reply("Halo @1234567812345")`

### Data Grup
Untuk mengambil data grup, gunakan `bot.getGroupData(id)`. Mereturn berikut, jika ada:
- `group`
    - `group.id` - ID grup
    - `group.subject` - Subject (judul) grup
    - `group.description` - Deskripsi grup
    - `group.getParticipants()` - Ambil list peserta grup berupa array berisi objek-objek dengan struktur berikut:
        - `participant`
            - `participant.id` - ID peserta. Bisa berupa JID atau LID
            - `participant.lid` - LID peserta
    - `group.getAdmins()` - Ambil list khusus admin grup
    - `group.getMembers()` - Ambil list khusus member (bukan admin)

## Alur Receiver
Receiver diperiksa satu per satu menurut urutan ia di-register. Jika dua receiver bisa di-trigger oleh satu pesan yang sama, maka hanya receiver pertama yang akan dieksekusi.
```js
// Kedua receiver ini bisa di-trigger oleh pesan yang bertuliskan "tes123" tapi hanya yang pertama yang akan merespon
bot.onReceive("tes123", "Ini akan dikirimkan.")
bot.onReceive(/^tes/, "Ini tidak akan dikirimkan.")
```

Di dalam fungsi respon, kamu bisa lanjutkan alurnya ke receiver berikutnya dengan fungsi `next()` yang ada di parameter ke-4:
```js
bot.onReceive(/.*/, (msg, captures, group, next) => {
    if (userAuthorized(msg.sender.id)) next()
    return "Kamu tidak punya akses!"
})

bot.onReceive("test", "Halo silakan masuk!")
```

### Memodifikasi Message
Objek `message` yang diteruskan ke fungsi respon adalah objek yang sama. Maka dari itu kamu bisa memodifikasi `message` ini dan perubahannya akan terlihat di fungsi-fungsi respon berikutnya.
```js
bot.onReceive(bot.messageType.any, (msg, cap, group, next) => {
    msg.watermark = "MyBot"
    next()
})

bot.onReceive("test", (msg) => {
    return `Brought to you by ${msg.watermark}`
})
```

## Enum Tipe Message
`bot.messageType` mempunyai enum-enum berikut:
- `any`: Ini sama seperti regex `/.*/` di dalam input receiver.
- `nonmedia`: This termasuk pesan `text` dan `reaction`.
- `media`: This termasuk `image`, `video`, `gif`, `audio`, `sticker` dan `document`.
- Lainnya: `text`, `reaction`, `image`, `video`, `gif`, `audio`, `sticker`, `document`.

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
            - sebagai function: `response(context, next)`. [Cek di sini](#fungsi-respon). Dengan tambahan property di dalam `context` yaitu `command`.
                - `context`
                    - `context.message` - Objek pesan
                    - `context.command` - Informasi command
                        - `context.command.prefix` - Prefix yang digunakan
                        - `context.command.name` - Nama command (jika yang digunakan adalah alias command, maka alias itu yang tertulis di sini)
                        - `context.command.parameters` - Parameter command (dalam Array). Contoh: `/test a b c` -> params = ["a","b","c"]
                        - `context.command.description` - Deskripsi command
                        - `context.command.aliases` - Alias dari command ini (array)
                        - `context.command.hidden` - Apakah ini termasuk command yang disembunyikan dari menu generator
                        - dan property custom lain yang diset ketika membuat command tsb., yang ada di dalam `options`
                - `next` - Function untuk berpindah ke receiver berikutnya. (Lihat [Alur Receiver](#alur-receiver))

            - sebagai function (susunan sebelumnya, sudah deprecated): `response(message, params, command, prefix, group, bot)`
                - `message` - Pesan perintah
                - `params` - Parameter. Contoh: `/test a b c` -> params = ["a","b","c"]
                - `command` - Nama command yang digunakan.
                - `prefix` - Prefix yang digunakan
                - `group` - Info tentang grup dimana perintah ini dijalankan
                - `bot` - Objek bot yang sama dengan export utama wachan

        - `options` - Opsi tambahan untuk command ini. Kamu bisa berikan data-data custom di dalam sini. Untuk data bawaannya yaitu sbb:
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
    - `commands.beforeEach(callback)` - Tambahkan callback yang akan dijalankan sebelum masuk ke setiap command. Ini berguna misalnya untuk otorisasi (contoh pengecekan owner/admin)
        - `callback(context, next)` - Callback yang akan ditambahkan
            - `context` - Sama seperti `context` saat menambahkan command baru dengan `commands.add()`
            - `next` - Fungsi untuk melanjutkan ke callback berikutnya, atau masuk ke command jika sudah tidak ada lagi callback.
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
cmd.add("multiply", function (context, next) { 
    // Susunan parameter lama: (msg, params)
    const [a, b] = context.command.parameters
    const result = Number(a) * Number(b)
    return `The result of ${a}*${b} is ${result}`
})

// Akan merespon ketika ada yang mengetik:
// /multiply 4 5
// Bot akan mengalikan 4 and 5 lalu mengirimkan hasilnya di chat.
```

Contoh penggunaan `beforeEach()`:
```js
const cmd = require("wachan/commands")

cmd.beforeEach((context, next) => {
    const { adminOnly } = context.command
    const { isAdmin } = context.message.sender
    
    if (adminOnly && !isAdmin) return `Hanya admin yang bisa menggunakan command ini!`

    next()
})

cmd.add("special", async (context, next) {
    return "Special command sudah dieksekusi!"
}, { adminOnly: true })

// Ketika user mengetik /special, maka akan dicek dulu apakah dia admin, jika tidak maka ditolak
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
        - `options.size` - Panjang sisi stiker (lebar atau tingginya). Default 128 untuk video, dan 512 untuk selain video. Ini mempengaruhi ukuran stiker. Di Whatsapp ukuran stiker maksimum adalah 1MB.
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
4. `bot.start({ configOverrides: {...} })` untuk meng-override (mengganti) konfigurasi pada baileys (parameter di fungsi makeWASocket)

<hr>
<br>
<br>

# Changelog

## [1.12.0] 2025-12-14
### Ditambahkan
- `bot.getUserData()`
- `cmd.beforeEach()`
- Mengirim dan menerima kontak
- Mengirim dan menerima polling
- `options.configOverrides` pada parameter fungsi `start()`
### Diperbaiki
- Status admin dari user akan terupdate tanpa harus program direstart dulu
- Sekarang bisa menghapus reaction dengan menggunakan string kosong
### Akan Dihilangkan
- Parameter dari fungsi respon akan disederhanakan menjadi 2: `context` dan `next`. Ini juga akan berlaku untuk fungsi respon dari command.

## [1.11.0] 2025-11-09
### Ditambahkan
- `bot.getGroupData(jid)`
- `bot.messageType`
- `bot.onError()`
- Opsi `phoneNumber` di dalam `bot.start(option)`
- Jenis message baru `buttons`
- Argumen ke-4 di dalam fungsi respon, `next`
- `message.id`
- `message.delete()`
- `message.getQuoted()` sekarang sudah tersedia juga di message tanpa quoted, tetapi akan mereturn `null`
- `commands.getCommands()`
- Field baru `size` pada options di `sticker.create()`

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
