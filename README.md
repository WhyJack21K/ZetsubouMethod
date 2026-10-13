# Zetsubou Method

Aplikasi web sederhana untuk mengenkripsi dan mendekripsi teks langsung di browser. Antarmukanya menggunakan HTML dan CSS biasa, sedangkan seluruh logika aplikasi berada di JavaScript tanpa dependensi tambahan.

## Fitur

- Enkripsi dan dekripsi teks dengan AES-256-GCM melalui Web Crypto API.
- Frasa sandi diubah menjadi kunci dengan PBKDF2-HMAC-SHA-256 sebanyak 600.000 iterasi.
- Salt acak 16 byte dan initialization vector (IV) acak 12 byte dibuat untuk setiap enkripsi.
- Mendukung teks Unicode, termasuk emoji.
- Hasil enkripsi versi lama dapat dibuka untuk membantu memindahkan data ke format baru.
- Tombol salin/tempel clipboard dan tampilan yang menyesuaikan layar kecil.

## Menjalankan aplikasi

Tidak ada proses build atau dependensi yang perlu dipasang. Web Crypto memerlukan konteks aman, jadi jalankan aplikasi melalui HTTPS atau server lokal. Contoh dengan Python:

```bash
git clone https://github.com/WhyJack21K/ZetsubouMethod.git
cd ZetsubouMethod
python -m http.server 8000
```

Buka <http://localhost:8000> di browser modern.

## Cara menggunakan

### Enkripsi

1. Tulis atau tempel teks yang ingin dienkripsi.
2. Masukkan frasa sandi minimal 12 karakter. Gunakan frasa yang panjang dan unik.
3. Pilih **Enkripsi teks**, lalu salin dan simpan hasilnya.

### Dekripsi

1. Tempel hasil enkripsi pada bagian **Dekripsi**.
2. Masukkan frasa sandi yang sama.
3. Pilih **Dekripsi teks**.

Frasa sandi tidak disimpan atau dikirim oleh aplikasi. Jika frasa sandi hilang, teks tidak dapat dipulihkan.

## Format enkripsi baru

Hasil baru diawali dengan `ZSM1.` dan disusun sebagai berikut:

```text
ZSM1.<salt-base64url>.<iv-base64url>.<ciphertext-dan-tag-base64url>
```

Versi format `ZSM1` menetapkan PBKDF2-HMAC-SHA-256 dengan 600.000 iterasi dan AES-256-GCM. Header versi ikut diautentikasi bersama ciphertext. AES-GCM mendeteksi perubahan data dan frasa sandi yang salah. Aplikasi membuat salt 16 byte dan IV 12 byte acak untuk setiap enkripsi.

## Dukungan format lama

Teks Base64 dari versi awal dapat dimasukkan langsung ke bagian dekripsi dengan kunci lama. Aplikasi akan menampilkan peringatan setelah membuka hasil tersebut. Algoritma lama hanya menggeser kode karakter, tanpa autentikasi; teks yang berubah atau kunci yang salah dapat menghasilkan keluaran yang tampak seperti teks biasa.

Setelah membuka teks lama, salin hasil dekripsi lalu enkripsi kembali memakai format baru. Hindari memakai metode lama untuk membuat pesan baru.

## Catatan keamanan

- Aplikasi memproses teks dan frasa sandi di browser; tidak ada backend atau layanan pihak ketiga di dalam proyek ini.
- Gunakan frasa sandi yang panjang dan unik. Jumlah iterasi KDF tidak dapat menggantikan frasa sandi yang mudah ditebak.
- Siapa pun yang memperoleh ciphertext tetap dapat mencoba menebak frasa sandinya secara offline.
- Simpan frasa sandi dan ciphertext di tempat yang aman. Aplikasi tidak memiliki fitur pemulihan.
- Proyek ini merupakan alat belajar dan belum menjalani audit keamanan independen. Jangan jadikan satu-satunya perlindungan untuk data yang sangat penting.

## Struktur proyek

```text
ZetsubouMethod/
├── index.html   # Struktur halaman dan form
├── styles.css   # Tampilan dan layout responsif
├── app.js       # Validasi input, kriptografi, dan clipboard
└── README.md    # Dokumentasi proyek
```
