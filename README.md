# Zetsubou Method

Aplikasi web sederhana untuk mengenkripsi dan mendekripsi teks menggunakan sebuah kunci. Seluruh antarmuka dan logika saat ini berada dalam satu file HTML.

> **Catatan keamanan:** proyek ini dibuat sebagai demonstrasi/eksperimen. Metodenya bukan kriptografi yang aman. Jangan gunakan untuk melindungi kata sandi, data pribadi, atau informasi rahasia.

## Fitur

- Mengenkripsi teks dengan kunci yang dimasukkan pengguna.
- Mendekripsi hasil dengan kunci yang sama.
- Menyalin hasil enkripsi dan menempelkan teks dari clipboard.
- Menampilkan pesan jika input atau kunci tidak valid.

## Cara kerja

1. Setiap kode karakter teks dijumlahkan dengan kode karakter kunci yang diulang sepanjang teks.
2. Hasilnya dikodekan ke Base64 untuk ditampilkan.
3. Proses dekripsi membalikkan Base64 lalu mengurangi kode karakter kunci dari tiap karakter.

Base64 hanya format encoding, bukan enkripsi. Algoritma geser karakter di proyek ini juga tidak dirancang untuk keamanan.

## Menjalankan aplikasi

Tidak ada proses build atau dependensi yang perlu dipasang. Clone repositori, lalu buka `index.html` di browser modern:

```bash
git clone https://github.com/WhyJack21K/ZetsubouMethod.git
cd ZetsubouMethod
```

Untuk memakai tombol clipboard, jalankan server lokal dari folder proyek karena akses clipboard bergantung pada izin dan konteks aman browser:

```bash
python -m http.server 8000
```

Buka <http://localhost:8000>.

## Cara menggunakan

### Enkripsi

1. Masukkan teks pada bagian **Encrypt Section**.
2. Masukkan kunci yang berisi huruf, angka, atau simbol ASCII.
3. Pilih **Encrypt**.
4. Salin hasilnya dengan tombol **Copy**.

### Dekripsi

1. Tempelkan hasil enkripsi pada bagian **Decrypt Section**.
2. Masukkan kunci yang sama seperti saat enkripsi.
3. Pilih **Decrypt** untuk melihat teks asal.

## Batasan

- Kunci harus berisi setidaknya satu karakter. Karakter kunci yang diterima adalah huruf Latin, angka, simbol ASCII, dan spasi.
- Konversi memakai fungsi browser `btoa()`/`atob()`. Nilai kode karakter hasil proses yang berada di luar rentang byte dapat menyebabkan enkripsi gagal; teks Unicode seperti emoji juga tidak didukung dengan andal.
- Kunci yang salah dapat menghasilkan teks yang tidak terbaca.
- Dukungan clipboard bergantung pada izin browser. Jika tombol clipboard gagal saat membuka file langsung, gunakan server lokal seperti langkah di atas.

## Struktur proyek

```text
ZetsubouMethod/
└── index.html    # Antarmuka, CSS, dan logika enkripsi/dekripsi
```