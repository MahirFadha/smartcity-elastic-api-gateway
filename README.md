# Elastic API Gateway dengan Traffic Rate Limiting & Circuit Breaker
> **Tugas Besar Mata Kuliah Cloud Computing (3 SKS)**  
> **Studi Kasus:** API Gateway Portal Layanan Publik Smart City  
> **Kelompok 6 - Kelas Kamis Pagi**

---

## 👥 Anggota Kelompok 6 (Kelas Kamis Pagi)
| Nama Mahasiswa | NIM | Peran (*Role*) |
| :--- | :---: | :--- |
| **M. Sulthan Mahir Fadha** | 09020623035 | Project Coordinator & Gateway Engineer |
| **Ade Erhans Nasution** | 09040623052 | Backend & Microservices Developer |
| **Irfan Daffayudha** | 09010623006 | Infrastructure & Docker Engineer |
| **Ahmad Ghozi Darmawan** | 09020623017 | QA, Documentation & Video Creator |

---

## 🏛️ Arsitektur Sistem & Skema Jaringan

Sistem mengadopsi pola **API Gateway Pattern** terisolasi dengan menggunakan **Kong Gateway (DB-less mode)** sebagai gerbang masuk tunggal, **Redis** sebagai pencatat kuota terdistribusi, serta dua *Mock Microservices* backend.

![Diagram Arsitektur](./Diagram%20Arsitektur.png)

### 🔒 Topologi Jaringan (`smartcity-net`) & Isolasi Port
* **Jaringan:** *User-Defined Bridge Network* (`smartcity-net`) dengan DNS internal otomatis.
* **Port Terbuka (Public):** Hanya Port `80` (Kong Gateway) yang dapat diakses oleh publik/klien penguji.
* **Port Terisolasi (Private):** Redis (6379), Service Kependudukan (3000), dan Service Pajak (3000) **tidak dipublish ke host**, menjamin keamanan mikroservis dari akses langsung tanpa otorisasi.

---

## ⚙️ Batasan Sumber Daya (*Resource Limits*)
Sesuai standar teknis penilaian 3 SKS, seluruh *container* dibatasi sumber dayanya pada `docker-compose.yml`:
* `cpus: '0.25'` (Maksimal 25% dari 1 core CPU)
* `memory: 256M` (Maksimal RAM 256 MB)

Batasan ini menjamin skenario *load testing* dan *failover* teruji secara nyata tanpa membebani sistem operasi laptop host.

---

## 🚀 Panduan Menjalankan Sistem (*Quick Start*)

### 1. Prasyarat
* Docker Desktop sudah terinstal dan berjalan.
* Git & Python 3 (opsional, untuk menjalankan skrip pengujian cepat).

### 2. Menjalankan Seluruh Layanan
Jalankan perintah berikut di direktori utama:
```bash
docker compose up --build -d
```

Verifikasi bahwa seluruh 4 container telah berjalan (*Up*):
```bash
docker compose ps
```

Periksa penggunaan memori & CPU (membuktikan *resource limit* aktif):
```bash
docker stats
```

---

## 🧪 Skenario Pengujian & Live Demo (7 Menit)

### A. Uji Konektivitas Normal
Akses kedua layanan publik melalui Gateway (Port 80):
* **Service Kependudukan (Delay 50ms):**
  ```bash
  curl -i http://localhost/api/v1/kependudukan
  ```
* **Service Pajak (Delay 100ms):**
  ```bash
  curl -i http://localhost/api/v1/pajak
  ```

### B. Uji Skenario 1: Traffic Rate Limiting (Mencegah Overload)
Jalankan skrip pengujian otomatis menggunakan Python:
```bash
python tests/test-endpoints.py
```
* **Hasil:** Saat request melebihi kuota 20 req/detik, Kong Gateway langsung merespons dengan **`HTTP 429 Too Many Requests`** dan menyertakan header `X-RateLimit-Remaining-Second`.
* **Uji Beban 1.000 VU (K6):**
  ```bash
  k6 run tests/k6-load-test.js
  ```

### C. Uji Skenario 2: Disaster Recovery & Circuit Breaker
Simulasi kegagalan layanan backend saat sistem berjalan:

1. **Jalankan pengujian trafik:**
   ```bash
   python tests/test-endpoints.py
   ```
2. **Matikan Service Pajak secara paksa di terminal terpisah:**
   ```bash
   docker stop service-pajak
   ```
3. **Hasil Pembuktian ke Dosen:**
   * Panggilan ke `/api/v1/pajak` langsung memicu **Circuit Breaker** mengembalikan **`HTTP 503 Service Unavailable`** secara instan (0ms RTO) tanpa *timeout* atau *hang*.
   * Panggilan ke `/api/v1/kependudukan` **tetap berjalan 100% normal dan lancar** tanpa terganggu (*No Cascading Failure*).
4. **Pemulihan (*Recovery*):**
   ```bash
   docker start service-pajak
   ```
   Gateway secara otomatis mendeteksi pulihnya service melalui *healthcheck* dan rute kembali normal (*CLOSED state*).

---

## 📁 Struktur Direktori Repositori
```text
.
├── docker-compose.yml          # Konfigurasi orkestrasi 4 container & resource limits
├── Diagram Arsitektur.png       # Diagram visual arsitektur sistem
├── Panduan_Tugas_Besar_Kelompok_6.pdf # Dokumen panduan & perencanaan lengkap
├── gateway/
│   └── kong.yml                # Konfigurasi deklaratif rute, healthcheck & rate limiting
├── services/
│   ├── kependudukan/
│   │   ├── Dockerfile          # Docker image berbasis Node.js Alpine
│   │   └── server.js           # Mock API Kependudukan (Delay 50ms)
│   └── pajak/
│       ├── Dockerfile          # Docker image berbasis Node.js Alpine
│       └── server.js           # Mock API Pajak (Delay 100ms)
└── tests/
    ├── test-endpoints.py       # Skrip pengujian otomatis fungsional & rate limit
    └── k6-load-test.js         # Skrip pengujian beban 10-1000 VU (K6)
```

---

## 📊 Rubrik Evaluasi Penilaian
* [x] **Kelengkapan Arsitektur (20%):** Bridge network terisolasi, DNS internal, limit `cpus: 0.25` & `memory: 256M`.
* [x] **Pengujian Skalabilitas (25%):** Proteksi Rate Limiting terintegrasi Redis (HTTP 429) & skrip K6 1000 VU.
* [x] **Eksekusi Disaster Recovery (25%):** Circuit Breaker active/passive health check dengan isolasi kegagalan (HTTP 503).
* [x] **Progres Mingguan (15%):** Pemenuhan luaran Pertemuan 9 & 10.
* [x] **Kerapihan Repositori (15%):** Dokumentasi `README.md`, instruksi eksekusi satu langkah (`docker compose up`).
