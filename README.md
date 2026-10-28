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

## 🏛️ Arsitektur Sistem & Skema Jaringan (High Availability Cluster)

Sistem mengadopsi pola **API Gateway Pattern** berbasis klaster tahan banting (*High Availability & Fault-Tolerant*) yang terdiri dari **7 kontainer terpadu**:

1. **Kong Gateway (Stateless DB-less Mode):** Pintu masuk tunggal (*Single Entry Point*) pada Port 80 publik yang membaca konfigurasi dari `kong.yml` langsung ke RAM tanpa ketergantungan database eksternal. Berfungsi sebagai *Ingress Reverse Proxy*, *Upstream Load Balancer (Round-Robin)*, dan *Circuit Breaker*.
2. **Sepasang Redis High Availability (Master-Replica):**
   * **Redis Primary (Master):** Mencatat kuota transaksi rate limiting secara *in-memory* (< 1ms).
   * **Redis Replica (Slave):** Menerima duplikasi data kuota secara terus-menerus melalui *Continuous Asynchronous Replication*.
   * **Fail-Open Policy:** Jika klaster Redis tidak dapat dijangkau, Gateway secara otomatis mengaktifkan kebijakan *Fail-Open* (`fault_tolerant: true`) untuk mem-bypass kuota sementara agar layanan warga tetap berjalan normal (**HTTP 200 OK**).
3. **Klaster Backend Microservices (Active-Active Replicas):**
   * **Service Kependudukan (Worker 1 & Worker 2):** Delay buatan 50ms, menerima beban rotasi seimbang (*Round-Robin*) dari Upstream Load Balancer.
   * **Service Pajak (Worker 1 & Worker 2):** Delay buatan 100ms, menerima beban rotasi seimbang (*Round-Robin*) dan dilindungi oleh *Circuit Breaker Engine*.

![Diagram Arsitektur](./Diagram%20Arsitektur.png)

---

### 🔒 Topologi Jaringan (`smartcity-net`) & Pemetaan 7 Kontainer

Sistem menggunakan *user-defined bridge network* dengan isolasi port ketat (*Least Privilege*):

| No | Nama Layanan | Nama Kontainer | Port Internal | Port Publik (Host) | Resource Limits | Status Isolasi |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- |
| **1** | **Kong API Gateway** | `smartcity-gateway` | `8000`, `8001` | `80:8000`, `8001:8001` | CPU: 0.25 \| RAM: 256M | **Publik (Entrypoint Utama)** |
| **2** | **Redis Primary (Master)** | `smartcity-redis-primary` | `6379` | *None* | CPU: 0.25 \| RAM: 256M | Terisolasi Jaringan Internal |
| **3** | **Redis Replica (Slave)** | `smartcity-redis-replica` | `6379` | *None* | CPU: 0.25 \| RAM: 256M | Terisolasi Jaringan Internal |
| **4** | **Service Kependudukan (Node 1)** | `service-kependudukan-1` | `3000` | *None* | CPU: 0.25 \| RAM: 256M | Terisolasi Jaringan Internal |
| **5** | **Service Kependudukan (Node 2)** | `service-kependudukan-2` | `3000` | *None* | CPU: 0.25 \| RAM: 256M | Terisolasi Jaringan Internal |
| **6** | **Service Pajak (Node 1)** | `service-pajak-1` | `3000` | *None* | CPU: 0.25 \| RAM: 256M | Terisolasi Jaringan Internal |
| **7** | **Service Pajak (Node 2)** | `service-pajak-2` | `3000` | *None* | CPU: 0.25 \| RAM: 256M | Terisolasi Jaringan Internal |

---

## ⚙️ Penegakan Batasan Sumber Daya (*Resource Limits*)

Sesuai standar teknis 3 SKS, seluruh 7 kontainer dikunci sumber dayanya pada berkas `docker-compose.yml`:
* `cpus: '0.25'` (Maksimal 25% dari 1 core CPU host)
* `memory: 256M` (Maksimal RAM 256 MB per kontainer)

Batasan ini divalidasi langsung melalui cgroups kernel Linux via perintah `docker stats` untuk memastikan simulasi beban tidak menyebabkan laptop host *hang*.

---

## 🚀 Panduan Menjalankan Sistem (*Quick Start*)

### 1. Prasyarat
* Docker Desktop aktif dan berjalan.
* Git & Python 3.

### 2. Menjalankan Seluruh Klaster (7 Kontainer)
Eksekusi perintah berikut di direktori utama:
```bash
docker compose up --build -d
```

Verifikasi bahwa seluruh 7 kontainer telah berstatus **Up**:
```bash
docker compose ps
```

Periksa penggunaan memori & CPU (membuktikan alokasi 256 MB):
```bash
docker stats --no-stream
```

---

## 🧪 Skenario Pengujian & Live Demo

### A. Uji Konektivitas Normal
Akses kedua layanan publik melalui Gateway Port 80:
* **Service Kependudukan (Delay 50ms):**
  ```bash
  curl -i http://localhost/api/v1/kependudukan
  ```
* **Service Pajak (Delay 100ms):**
  ```bash
  curl -i http://localhost/api/v1/pajak
  ```

### B. Uji Otomatis: Load Balancing & Rate Limiting
Jalankan skrip pengujian komprehensif menggunakan Python:
```bash
python tests/test-endpoints.py
```
* **Hasil Pengujian 1 (Round-Robin Load Balancing):** Request berurutan ke Kependudukan secara otomatis dilayani bergantian oleh **Worker 1** dan **Worker 2** (tertera di header `X-Served-By`).
* **Hasil Pengujian 2 (Traffic Rate Limiting):** Saat ditembak 35 request serentak, 20 request pertama berhasil (**HTTP 200 OK**) dan 15 request sisanya dipotong oleh Gateway dengan respons **`HTTP 429 Too Many Requests`**.

### C. Uji Skenario Disaster Recovery & Circuit Breaker

#### Skenario 1: Failover Antar-Worker (Zero Downtime)
1. Matikan Worker 1 Kependudukan secara paksa:
   ```bash
   docker stop service-kependudukan-1
   ```
2. Panggil kembali layanannya:
   ```bash
   curl -i http://localhost/api/v1/kependudukan
   ```
   * **Hasil:** Kong Upstream Load Balancer langsung mendeteksi Worker 1 mati dan mengalihkan 100% trafik ke **Worker 2**. Layanan tetap berjalan lancar (**HTTP 200 OK**) tanpa *downtime*.

#### Skenario 2: Circuit Breaker Ekstrem (Kedua Worker Mati)
1. Matikan seluruh worker Pajak:
   ```bash
   docker stop service-pajak-1 service-pajak-2
   ```
2. Panggil Service Pajak dan Service Kependudukan:
   * Panggilan ke Pajak langsung memicu **Circuit Breaker** mengembalikan **`HTTP 503 Service Unavailable`** secara instan (0ms RTO).
   * Panggilan ke Kependudukan **tetap berjalan normal 100%** (*No Cascading Failure*).
3. Pulihkan kembali:
   ```bash
   docker start service-pajak-1 service-pajak-2 service-kependudukan-1
   ```

#### Skenario 3: Uji Ketahanan saat Redis Mati (Fail-Open Policy)
1. Matikan Redis Primary:
   ```bash
   docker stop smartcity-redis-primary
   ```
2. Panggil layanan publik:
   ```bash
   curl -i http://localhost/api/v1/kependudukan
   ```
   * **Hasil:** Gateway menerapkan **Fail-Open Policy** (`fault_tolerant: true`). Warga tetap dilayani (**HTTP 200 OK**) tanpa terputus.

---

## 📁 Struktur Direktori Repositori
```text
.
├── docker-compose.yml                 # Konfigurasi orkestrasi 7 kontainer HA & limit resource
├── Diagram Arsitektur.png              # Diagram visual arsitektur sistem
├── diagram-arsitektur.mmd             # Sumber kode visualisasi Mermaid v3
├── ELASTIC API GATEWAY DENGAN TRAFFIC.docx # Draf naskah laporan perencanaan Word
├── gateway/
│   └── kong.yml                       # Konfigurasi rute, upstream load balancer, circuit breaker & redis
├── services/
│   ├── kependudukan/
│   │   ├── Dockerfile                 # Image Node.js Alpine ultra-ringan
│   │   └── server.js                  # Mock API Kependudukan (Delay 50ms + Worker ID)
│   └── pajak/
│       ├── Dockerfile                 # Image Node.js Alpine ultra-ringan
│       └── server.js                  # Mock API Pajak (Delay 100ms + Worker ID)
└── tests/
    ├── test-endpoints.py              # Skrip pengujian otomatis (koneksi, load balancing, & rate limit)
    └── k6-load-test.js                # Skrip pengujian beban bertahap 10-1000 VU (K6)
```

---

## 📊 Rubrik Evaluasi Penilaian
* [x] **Kelengkapan Arsitektur (20%):** Bridge network `smartcity-net`, DNS internal, 7 kontainer cluster, limit `cpus: 0.25` & `memory: 256M`.
* [x] **Pengujian Skalabilitas (25%):** Round-Robin Load Balancing, proteksi Rate Limiting terintegrasi Redis (HTTP 429), dan skrip K6 1000 VU.
* [x] **Eksekusi Disaster Recovery (25%):** Worker Failover (*Zero Downtime*), Circuit Breaker (HTTP 503), dan Fail-Open Policy saat Redis nonaktif.
* [x] **Progres Mingguan (15%):** Pemenuhan tuntas luaran Pertemuan 1 dan Pertemuan 2.
* [x] **Kerapihan Repositori (15%):** Dokumentasi `README.md` terstruktur, panduan verifikasi satu langkah (`docker compose up`).
