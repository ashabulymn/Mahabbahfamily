# Mahabbah Family Tour & Travel — website & CMS

## Gambar dan pemesanan paket

Gambar paket mengikuti lebar kontainer dengan rasio asli (`width: 100%; height: auto`), termasuk pada detail paket. Setiap paket terbit memiliki tombol WhatsApp dengan template pertanyaan/pemesanan yang menyertakan nama paket dari CMS; nama dan tautan ikut berubah setelah konten diperbarui. Scrollbar vertikal utama di sisi halaman tetap ditampilkan mengikuti pengaturan browser. Kartu dan jalur slider memakai tinggi otomatis tanpa max-height. Setiap kartu mengikuti isinya sendiri, tidak diregangkan setinggi kartu lain. Scroll vertikal pada jalur slider disembunyikan; tinggi jalur tetap memuat seluruh isi sehingga konten panjang memperpanjang halaman tanpa terpotong. Navigasi horizontal tab/slider tetap tersedia.

## Kontak dan referensi Instagram

Bio Instagram @mahabbahfamilytourtravel berhasil dibaca melalui browser pada 21 September 2026: PPIU **91200059707560001**, email **ptmahabbahfamily@gmail.com**, WhatsApp **0813-7497-0075**, kantor Maninjau–Bayur. Nomor izin sesuai bio, bukan hasil verifikasi status melalui registri pemerintah. Caption unggahan `DU-8_yNCWmI` dan `DQk8wiijGkq` menjadi rujukan sapaan “Sahabat Mahabbah Family” dan “Melayani sepenuh hati”; tautan sumber tersedia di beranda. Catatan lama tentang Instagram tidak dapat diakses menggambarkan kendala saat impor awal.

`contact.js` menyajikan kontak dan chatbox pada beranda, blog, galeri, serta detail paket. Form GET membuka draf pesan ke nomor WhatsApp resmi, tanpa menyimpan pesan atau mengirim otomatis. Pengguna tetap menekan Kirim di WhatsApp. Kontak dikelola di kode ini (belum menjadi koleksi CMS). Dialog konsultasi juga membawa pesan yang telah diedit ke WhatsApp. Tidak ada audio atau embed Instagram otomatis.

## Deploy website publik ke Netlify

`netlify.toml` menjalankan `node scripts/build-static.js` dan mempublikasikan hanya folder `dist`. Node.js 22 dipilih otomatis. Hubungkan repository/branch yang memuat konfigurasi ini, lalu deploy ulang. Jika ada pengaturan manual, gunakan build command tersebut dan publish directory `dist`, bukan root repository.

Build merender beranda (paket, tim, testimoni, blog, kontak), daftar blog, artikel terbit, galeri, dan detail semua paket terbit menjadi HTML. CSS, JavaScript, video, logo, dan gambar yang dirujuk konten terbit ikut disalin. URL detail dapat dibuka langsung atau direfresh; tidak perlu redirect semua URL ke beranda. Draf, kredensial, data JSON, source server, dan lampiran tidak dipublikasikan.

Sumber build Netlify adalah `data/seed.json` yang tersimpan di Git, bukan `data/content.json` lokal yang diabaikan Git. Perbarui sumber konten serta aset media, commit/push, lalu deploy ulang untuk memperbarui situs. Label ketersediaan dihitung saat build; lakukan rebuild setelah tanggal berlaku berubah/lewat. Jangan memasukkan kredensial atau informasi privat ke sumber konten.

**Batasan:** ini deployment publik statis, bukan CMS server. `/admin` menampilkan pemberitahuan, bukan form login yang tidak berfungsi. Login, edit konten, dan upload membutuhkan deployment Node.js dengan penyimpanan persisten. Server lokal yang ada tetap bekerja seperti sebelumnya. Konten publik dapat ditampilkan tanpa backend; kemampuan CMS tidak dijanjikan pada Netlify statis.

Build lokal: `node scripts/build-static.js`. Folder `dist` adalah hasil build dan tidak perlu di-commit.

## Jalankan dan login

Node.js **22 atau lebih baru**, tanpa dependency tambahan. Dari direktori proyek:

```powershell
node scripts\setup-admin.js
node server.js
```

Setup meminta password tersembunyi (14–128 karakter). Buka **http://localhost:3000/admin** lalu masukkan password tersebut; tidak ada username atau password bawaan. Website tetap bisa dibaca sebelum setup, tetapi login terkunci. Setup juga menerima `CMS_ADMIN_PASSWORD` dari environment untuk otomasi; gunakan secret manager, jangan tulis nilainya dalam source, command history, atau README. Hapus environment variable setelah setup. Password disimpan sebagai hash scrypt dengan salt acak, bukan teks asli.

Ganti/lupa password: `node scripts\setup-admin.js --reset`. Ini langsung membatalkan sesi lama. Jangan menyalin akun atau password website lama.

Jika port 3000 dipakai proses lain:

```powershell
$env:PORT = '3001'
node server.js
```

Task VS Code **Mahabbah: local preview** memakai port **3002**: **http://localhost:3002/** (CMS: **http://localhost:3002/admin**). Saat verifikasi, port 3000 dan 3001 sudah dipakai preview lama; proses tersebut tidak dihentikan. Default `node server.js` tetap loopback port 3000.

## Mengelola konten

Di `/admin`, pilih **Paket perjalanan / Tim / Testimoni / Blog / Galeri**. Klik item untuk mengedit atau **Konten baru** untuk menambah. Isi kolom, pilih gambar, centang **Terbitkan di website**, lalu **Simpan konten**. Tidak dicentang = draf, termasuk halaman detailnya (404). **Urutan** menentukan posisi. Hapus membutuhkan konfirmasi. Perubahan langsung tampil setelah halaman publik dimuat ulang.

- Paket: nama, judul, ringkasan, rincian lengkap, hotel, penerbangan, durasi, pembimbing, harga referensi, kategori, gambar, brosur gambar, catatan sumber, status, tanggal berlaku. Detail tersedia di `/paket/<id>`.
- Ketersediaan: **Wajib konfirmasi / arsip**, **Tersedia**, atau **Ditutup**. Tersedia memerlukan tanggal batas konfirmasi yang belum lewat; setelah tanggal lewat website otomatis meminta konfirmasi lagi. Harga tetap berlabel referensi, bukan jaminan harga terbaru. Verifikasi dan perbarui sumber, rincian, dan tanggal sebelum menyatakan tersedia.
- Blog: judul, ringkasan, isi teks biasa, tanggal, gambar. Halaman `/blog` dan `/blog/<id>`; tidak bergantung pada Instagram.
- Galeri: judul, foto, keterangan dan sumber di `/galeri`. Klik foto untuk membuka gambar penuh.
- Tim dan testimoni muncul pada beranda. Nama publik/testimoni hanya berasal dari tabel konten publik, bukan data login atau kontak pribadi.
- Pustaka gambar: unggah **PNG/JPEG/WebP maksimal 5 MB**, kemudian pilih dari dropdown editor; lihat pratinjau sebelum menyimpan. Nama file diacak. Hanya raster bersignature yang sesuai diterima, bukan SVG, HTML, PDF atau kode. Gambar yang masih direferensikan oleh konten/draf tidak dapat dihapus. Gambar di pustaka adalah aset publik walau konten masih draf: jangan unggah dokumen privat. Hapus metadata pribadi/EXIF terlebih dahulu; CMS tidak menghapus metadata atau mengubah ukuran gambar otomatis. Pastikan hak penggunaan dan persetujuan subjek foto.

Seluruh teks di-escape saat rendering; HTML lama diubah menjadi teks, tidak pernah dijalankan. Konten publik dirender server dan tetap terbaca tanpa JavaScript. CMS memerlukan JavaScript. Hero editorial, tab paket, dialog konsultasi, serta `bg1-web.mp4` dipertahankan.

## Koleksi ringkas di beranda

- **Satu tab untuk setiap paket terbit**, memakai **Nama** paket CMS (atau judul bila nama kosong), bukan kategori. Jumlah dan urutan mengikuti paket terbit serta kolom **Urutan**. Nama yang sama tetap memiliki ID tab/panel berbeda. Memilih tab menampilkan tepat satu paket, baik desktop maupun mobile; tidak ada tab Semua atau filter kategori. Kolom kategori CMS tetap tersedia untuk metadata paket.
- Tab horizontal mempertahankan garis bawah hijau dan dapat digeser pada layar sempit. **← / →** pada tab memindahkan fokus sekaligus memilih paket (berputar di ujung); **Home / End** memilih awal/akhir. Hanya tab aktif masuk urutan Tab keyboard; panel terhubung melalui ARIA. Tab terpilih digulir ke area terlihat, dengan reduced motion dihormati.
- Tombol paket **< / >** memilih paket sebelumnya/berikutnya dan menyinkronkan tab serta status **1 dari N**. Tombol batas dinonaktifkan; kontrol disembunyikan untuk nol/satu paket. Tanpa paket terbit, pesan kosong ditampilkan dan tidak ada tab.
- Penambahan, penghapusan, pengurutan, pengubahan nama, dan publikasi CMS tercermin setelah reload. Tidak ada batas jumlah paket, polling CMS, atau sinkronisasi lintas tab otomatis.
- Slider tim/testimoni tetap tiga kartu desktop, dua tablet, dan satu mobile; tombol **< / >** berpindah satu kelompok dengan status rentang kartu. Geser horizontal dengan sentuhan/trackpad atau scrollbar; fokuskan area kartu untuk **← / → / Home / End**. Kartu individual dan panel paket dapat difokuskan; detail paket tetap tersedia.
- Tinggi kartu paket, tim, dan testimoni mengikuti seluruh isi, tanpa tinggi tetap, max-height, atau scroll vertikal di dalam kartu. Konten panjang memperpanjang halaman utama; navigasi horizontal tetap tersedia. Gambar paket memakai `object-fit: contain`; logo dan palet asli tidak diubah. Preferensi reduced motion menonaktifkan animasi perpindahan; tidak ada autoplay slide. Autoplay video senyap tetap dipertahankan sesuai permintaan sebelumnya.
- Tanpa JavaScript, seluruh kartu tetap dapat dibaca lewat scrollbar/native swipe; tab dan tombol navigasi disembunyikan agar tidak menjadi kontrol mati.

## Sumber dan batas kesegaran

Impor selektif dari `Lampiran\mahr5644_mahabbah.sql` dan `Lampiran\public_html.zip` yang disediakan pemilik:

| Koleksi | Hasil |
| --- | --- |
| Paket | 6 paket asli, termasuk reguler, promo, Ramadhan, VIP, dan wisata Sumatera Barat; semua mulai sebagai wajib konfirmasi |
| Tim | 11 profil dari pembaruan Agustus–November 2024; jabatan kini belum diverifikasi |
| Testimoni | 4 testimoni asli November 2024; rating 1–5 dan foto publik |
| Blog | 3 artikel diimpor; 1 diterbitkan, 2 berisi Lorem ipsum disimpan sebagai draf |
| Galeri | 3 visual yang dirujuk halaman publik lama; bukan bukti perjalanan baru |
| Media | 26 raster yang direferensikan konten publik; tidak ada ekstraksi seluruh ZIP |

Paket menyebut jadwal **2025**; harga, penerbangan, hotel, dan pembimbing adalah arsip, **bukan penawaran terkini**. Paket tanpa tanggal tidak diasumsikan tersedia. Brosur PDF wisata tidak diekstrak/disajikan; rincian teks paket tetap tersedia. Galeri tidak mengarang tanggal/lokasi dokumentasi. Foto hero/tentang Unsplash tetap ilustrasi dan dibedakan dari koleksi lama. Instagram memerlukan login, sehingga testimoni menggunakan database lama, tidak diklaim sebagai ulasan Instagram terbaru. Materi panduan blog juga arsip dan perlu tinjauan editorial.

`data\seed.json` menyimpan konten publik awal. `scripts\media-manifest.json` mencatat pemetaan sumber media. Importer hanya mengizinkan empat tabel publik, tidak mengeksekusi SQL/PHP dan tidak mengimpor tabel login. Untuk meregenerasi seed/media secara sadar (tidak diperlukan untuk menjalankan website):

```powershell
node scripts\import-legacy.js
.\scripts\extract-media.ps1
```

Perintah ini memperbarui seed dan gambar legacy, **bukan** konten CMS aktif. Jangan jalankan ulang setelah mengganti gambar legacy tanpa backup. Arsip asli tetap tidak diubah dan tidak dilayani HTTP.

## Penyimpanan, backup, dan deployment

- `data\content.json`: database JSON aktif, dibuat dari seed hanya pada start pertama. Write memakai file staging, fsync, dan rename atomik. Kegagalan tulis tidak mengganti state aktif. Jangan mengedit file ini ketika server berjalan.
- `data\auth.json`: hash password dan revisi sesi; privat. Tidak ada endpoint yang menyajikannya.
- `media\`: gambar legacy dan unggahan. Konten, auth, dan media tetap ada setelah restart. Restart menutup sesi, bukan menghapus konten.
- Backup: hentikan **proses aplikasi ini saja**, salin `data\content.json`, `data\auth.json`, dan seluruh `media\` ke lokasi backup privat. Restore dalam keadaan server berhenti. Bila content rusak, startup gagal, bukan diam-diam mereset data. Jalankan satu proses writer saja; JSON lokal bukan database multi-instance. Pengeditan bersamaan memakai perubahan terakhir yang disimpan.
- `CMS_DATA_DIR` opsional untuk penyimpanan terisolasi; bila disetel, media berada dalam subfolder `media` di direktori itu. Gunakan lokasi yang sama saat setup dan menjalankan server. Untuk migrasi, salin konten/auth/media bersama-sama.
- Server hanya bind `127.0.0.1`. Untuk publikasi gunakan reverse proxy **HTTPS** menuju loopback, tetapkan `CMS_PUBLIC_ORIGIN` ke origin HTTPS tepat (tanpa trailing slash) dan `CMS_SECURE_COOKIE=1`, serta teruskan Host yang sesuai. Jangan expose direktori proyek sebagai static document root. Lindungi akun OS dan ACL Windows pada `data`, backup dan arsip; mode file POSIX saja bukan ACL Windows.
- Sesi token acak, HttpOnly, SameSite=Strict, batas idle 30 menit dan absolut 8 jam; Secure saat konfigurasi HTTPS. Mutasi memakai pemeriksaan Origin + CSRF. Login dibatasi 8 percobaan per 15 menit per alamat peer, termasuk keberhasilan, dengan maksimal 2 derivasi password bersamaan. Di belakang proxy semua pengunjung berbagi alamat peer; gunakan pembatasan tambahan di proxy jika perlu. Restart mereset limiter memori dan sesi.
- Allowlist route mencegah akses ke SQL, ZIP, kode, data privat dan video asli; CSP, nosniff, frame denial, batas payload, dan validasi tipe/kolom diterapkan. Tidak ada pendaftaran publik, reset password lewat email, checkout, pengiriman data jamaah, atau klaim izin usaha baru.

## Verifikasi implementasi

```powershell
node --test tests\cms.test.js tests\brand.test.js tests\collections.test.js
node --check admin.js
node --check cms-server.js
node --check render.js
```

**15 tes lulus** (termasuk suite induk): koleksi melebihi ukuran halaman, kategori/jumlah dinamis, draf, penghapusan hingga kosong, penambahan ulang, reset filter, kontrol keyboard dan reduced motion; checksum logo asli, palet/markup seluruh halaman, struktur MP4 tanpa handler audio, autoplay senyap/jeda/lanjut/fallback, serta setup/hash, route publik dan privat, login, cookie, CSRF/origin, validasi, escaping, CRUD semua koleksi, unggah/penghapusan media, draf, restart/persistensi, logout/reset, throttling, dan range video. Pengujian memakai folder terisolasi di proyek dan membersihkannya; password acak tidak dicetak. Runner terintegrasi VS Code tidak mendeteksi tes Node, sehingga suite dijalankan dengan runner bawaan Node.

Verifikasi koleksi ringkas: desktop 1440 px dan mobile 390 px diuji dengan konten asli serta storage terisolasi berisi 19 paket / 14 profil / 10 testimoni dan teks panjang. Navigasi awal/berikutnya/akhir, reset kategori, batas tinggi, tidak ada overflow halaman, isi panjang yang dapat digulir, penghapusan DOM hingga satu/kosong dan penambahan ulang lolos. Fixture dibersihkan tanpa mengubah konten CMS aktif. Browser terintegrasi tersembunyi membatasi interaksi pointer/animation-frame, sehingga validasi memakai event DOM dan reduced motion; gestur pada perangkat sentuh nyata dan autoplay di browser pengguna tetap perlu smoke test.

Browser preview: beranda memuat 6 paket/11 tim/4 testimoni; filter Wisata menyisakan 1 paket; dialog dan menu mobile bekerja; tidak ada overflow horizontal pada 1440/390 px. Blog memuat 1 artikel dan galeri 3 visual. CMS diuji login → tambah → edit → reload/persistensi → hapus → logout tanpa error JavaScript, menggunakan storage disposable terpisah. Browser terintegrasi membutuhkan event DOM programatik karena tab background membatasi interaksi/animation-frame; pemutaran otomatis video tetap bergantung kebijakan browser. HTTP range/HEAD dan atribut muted diverifikasi; uji playback visual pada browser normal sebelum publikasi.

---

## Branding asli dan mode tanpa suara

- Sumber logo: `Lampiran\public_html.zip` → `public_html/src/img/logo.png`, dirujuk oleh markup publik `index.php` dan `kontak.html`. Salinan **byte-identik** disajikan sebagai `/brand-logo.png` (PNG **406 × 74**); tanpa menggambar ulang, filter warna, atau memotong logo. SHA-256: `9512b05a7b9c1cd8a937251bc2dab8f9a5eb6649fb64d63087677abac7e82d21`.
- Warna dari `public_html/src/css/style.css`: **dark `#020617`**, **gold `#eecc19`**, **primary/amber `#f59e0b`**, **green `#3a7930`**. Kelas tersebut memang dipakai halaman publik lama (header `bg-dark`, aksen `text-gold`, panel `bg-green/90`). Warna piksel logo dipertahankan, bukan dipaksa menjadi warna CSS.
- Header/footer beranda, detail paket/artikel, blog, galeri, dan header CMS memakai aset yang sama. Ruang putih dan panel hijau pucat menjaga keterbacaan; komposisi editorial asimetris dan isi CMS dipertahankan. Logo adalah aset tetap di luar pustaka unggahan, sehingga tidak terhapus melalui CMS dan tetap tersedia dengan `CMS_DATA_DIR` terisolasi.
- Ekstraksi ulang selektif: `.\scripts\extract-brand.ps1`. Script hanya membaca satu entri logo, memverifikasi checksum, dan menulis `brand-logo.png`; tidak mengekstrak/menjalankan PHP privat, login, atau SQL, serta tidak mengubah arsip.
- Audit halaman/template, JS dan konten publik tidak menemukan audio atau embed pemutar. Media CMS hanya raster. CSP menolak iframe/object; server hanya menyajikan video web yang diizinkan. `ffprobe` dan tes parser MP4 memastikan `bg1-web.mp4` **tidak memiliki track audio**, sehingga tidak perlu dienkode ulang. File asli/arsip tidak diubah.
- Hero tetap `autoplay muted loop playsinline`. JavaScript memaksa `defaultMuted`, `muted`, dan `volume = 0`, termasuk sebelum play/resume dan setelah perubahan volume. Tombol putar/jeda tetap tersedia. Autoplay adalah upaya, bukan jaminan semua browser/perangkat.
- Verifikasi browser: 18 kombinasi halaman/viewport (beranda, blog, galeri, detail paket/artikel, CMS pada 1440, 390, dan 320 px) tanpa overflow horizontal; seluruh logo dan gambar lokal termuat, header sesuai `#020617`, tanpa audio/embed. Navigasi mobile, filter Wisata, dialog konsultasi, play/jeda dan pemaksaan mute/volume nol lolos. Browser melaporkan decoded audio 0; preview tab tersembunyi dapat menunda playback. Tes memakai runner Node karena integrasi tes VS Code tidak menemukan suite.

## Catatan desain dan video



Website konsep berbahasa Indonesia dengan arahan visual jurnal perjalanan: pembuka fotografis imersif, manifesto beruang lega, pilihan perjalanan dalam baris kartu ringkas, cerita identitas layar penuh, indeks editorial, persiapan interaktif, dan penutup personal. Palet asli navy–emas–hijau, serif editorial, garis tipis, serta nomor bab mengikat komposisi dengan koleksi kartu yang tetap ringkas.

`styles.css` menyediakan fondasi; `editorial.css` mengatur arahan visual dan responsivitas; `brand.css` dimuat terakhir pada semua halaman publik dan CMS untuk palet asli. Reveal sekali saat scroll dan gerak gambar saat hover dibuat singkat; preferensi `prefers-reduced-motion` dihormati. Konten tetap terlihat tanpa JavaScript. Tab per paket, accordion persiapan, dan dialog konsultasi mendukung perjalanan pengunjung; pesan dapat disalin untuk DM Instagram.

## Menjalankan

Memerlukan Node.js, tanpa dependency tambahan.

```powershell
node server.js
```

Buka http://localhost:3000. Port dapat diubah melalui environment variable `PORT`. Server pengembangan hanya mendengarkan pada loopback.

## Video pembuka

Background menggunakan `bg1-web.mp4`, versi web dari `bg1.mp4` yang diberikan pengguna di root project. File asli tetap disimpan tanpa perubahan. Encoding H.264, 1280×720, 30 fps, CRF 27, tanpa audio, dengan MP4 faststart; durasi penuh sekitar 56 detik dipertahankan. Video diputar otomatis tanpa suara, loop, dan inline pada mobile, dengan tombol putar/jeda. Foto sebelumnya tetap menjadi fallback saat video belum siap, gagal dimuat, atau JavaScript tidak aktif. Video mencoba autoplay pada desktop dan mobile, termasuk saat reduced motion aktif, sesuai permintaan pemilik. Animasi dekoratif tetap menghormati reduced motion. Track audio tidak disertakan; muted dan volume nol juga ditegakkan melalui JavaScript. Kebijakan browser, mode hemat daya, atau pengaturan perangkat dapat tetap memblokir autoplay; tombol putar/jeda tersedia sebagai fallback. Server mendukung HTTP byte ranges untuk streaming dan seek tanpa membaca seluruh video ke memori. Ukuran turun dari 89.98 MB menjadi 18.99 MB (sekitar 79% lebih kecil). Website hanya menyajikan versi web; file asli tidak perlu diunggah saat deployment.

Uji playback, jeda/lanjut, mode reduced motion, dan fallback bila video gagal dimuat.

## Konten dan publikasi

Acuan akun: https://www.instagram.com/mahabbahfamilytourtravel/

Instagram masih memerlukan login. Logo dan warna kini mengikuti aset publik asli dalam ZIP pemilik; komposisi halaman tetap merupakan arahan editorial, bukan salinan tata letak website lama. Data arsip yang kini diimpor dijelaskan di bagian sumber di atas. Gambar Unsplash adalah ilustrasi, bukan dokumentasi jamaah. Font diambil dari Google Fonts; akses internet diperlukan untuk gambar dan font eksternal.

Sebelum publikasi, konfirmasikan branding, hak penggunaan aset, jabatan tim, testimoni, dan rincian layanan dengan pemilik. Formulir konsultasi publik hanya menyusun pesan lokal, tidak mengirim data jamaah. CMS mengirim dan menyimpan konten publik yang dimasukkan pengelola.

## Pemeriksaan

```powershell
node --check app.js
node --check server.js
```

Uji tab per paket (nama, urutan CMS, nol/satu/banyak paket, nama duplikat), klik/←/→/Home/End, tombol sebelumnya/berikutnya, scroll tab mobile tanpa overflow halaman, navigasi mobile, dialog perjalanan, perubahan bulan/jumlah jamaah, salin pesan, tautan Instagram, dan penutupan dialog melalui tombol serta Escape.
