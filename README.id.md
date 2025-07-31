Bahasa: [🇬🇧 Inggris](README.md) 🇮🇩 Indonesia

# wachan
Cara yang lebih simpel untuk meng-kode baileys.

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
    // Bisa membalas pesan dengan message.reply()
    await message.reply(`Hi, ${message.sender.name}!`)
    // Bisa juga cukup dengan me-return string untuk membalas
    return `Hi, ${message.sender.name}!`
})

// Menggunakan function sebagai input, argument pertama juga berisi message. Ini bisa dipakai untuk memfilter pesan
bot.onReceive(
    (message) => message.sender.name == "Don",
    "You again"
)

// Menggunakan regex sebagai input
bot.onReceive(/good (morning|afternoon|evening)/i, "to you as well")

// Mengambil bagian dari teks menggunakan regex. Hasilnya akan dimasukkan ke teks output menggantikan pola <<angka/nama>>. Penomoran dimulai dari 0.
bot.onReceive(/nama saya (\w+)/, "Halo, <<0>>!")
bot.onReceive(/Saya tinggal di (?<tempat>\w+)/, "<<tempat>> itu dimana ya?")

// Jika menggunakan function sebagai output, teks yang diambil dengan regex masuk ke argument kedua dari function nya
bot.onReceive(/^translate (.+)/, async (message, data) => {
    const translation = await translate(data[0])
    return translation
})
bot.onReceive(/Aku adalah (?<name>\w+)/, async (message, data) => {
    return `${data.name} adalah nama yang keren!`
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
}
```
Pengaturan ini bisa diubah ketika bot berjalan dengan cara mengakses `bot.settings`. Untuk menyimpan perubahan supaya tetap berlaku ketika bot dijalankan berikutnya, gunakan `bot.settings.save()`.<br>Penjelasan tiap item di pengaturan:
- `receiveOfflineMessages`: Jika `true`, maka akan memproses pesan-pesan yang masuk ketika bot sedang off. Pesan yang dimaksud adalah yang dituliskan pada `bot.onReceive`.

## Function Handler untuk Pesan
Kamu bisa gunakan function sebagai respon pesan. Argument pertamanya adalah `message` dan keduanya adalah `data` (jika ada).
```js
bot.onReceive("test", async function (message, data) {
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
- `message.toBaileys()` - Me-return objek message asli dari modul baileys

### Data
Argument kedua adalah `data` yaitu objek yang berisi string teks-teks yang diambil (di-capture) dengan regex. Jika tidak ada, maka array-nya kosong.

Key dari objek nya tergantung pada regex-nya. Jika menggunakan capturing biasa dengan tanda kurung, maka hasilnya tersimpan pada key berupa angka (mulai dari 0). Jika menggunakan <i>named capture</i>, maka key-nya berupa string.

Regex Input|Teks yg diterima|Objek `data`
-|-|-
`/Nama saya (\S+)\. Saya tinggal di (\S+)\./` | `"Nama saya Wachan. Saya tinggal di NPM.` | `{"0":"Wachan", "1":"NPM"}`
`/Nama saya (?<nama>\S+)\. Saya tinggal di (?<lokasi>\S+)\./` | `"Nama saya Wachan. Saya tinggal di NPM.` | `{"nama":"Wachan", "lokasi":"NPM"}`

## Custom Programming
Kamu bisa akses item-item ini untuk memprogram fungsi tambahan sendiri.
1. Objek socket milik baileys: `bot.getSocket()`
2. Objek pesan milik baileys: `message.toBaileys()`