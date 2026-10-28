const http = require('http');

const PORT = process.env.PORT || 3000;
const SERVICE_NAME = process.env.SERVICE_NAME || 'Service Pajak';
const WORKER_ID = process.env.WORKER_ID || 'Worker 1';
const DELAY_MS = parseInt(process.env.ARTIFICIAL_DELAY_MS || '100', 10);

// Sample mock data for Smart City tax records (PBB, Retribusi, PKB)
const mockTaxes = [
  { nop: "32.01.010.001.002-0045.0", pemilik: "Budi Santoso", jenis_pajak: "PBB-P2", tahun: 2026, jumlah: 450000, status_bayar: "LUNAS", jatuh_tempo: "2026-08-31" },
  { nop: "32.01.010.002.003-0112.0", pemilik: "Siti Rahmawati", jenis_pajak: "PBB-P2", tahun: 2026, jumlah: 320000, status_bayar: "BELUM_LUNAS", jatuh_tempo: "2026-08-31" },
  { nop: "32.01.010.005.001-0899.0", pemilik: "PT Inovasi Kota Digital", jenis_pajak: "Pajak Reklame", tahun: 2026, jumlah: 2500000, status_bayar: "LUNAS", jatuh_tempo: "2026-06-30" },
  { nop: "32.01.010.008.004-0341.0", pemilik: "Dewi Lestari", jenis_pajak: "Retribusi Sampah & Kebersihan", tahun: 2026, jumlah: 60000, status_bayar: "LUNAS", jatuh_tempo: "2026-12-31" }
];

const server = http.createServer((req, res) => {
  // CORS & JSON Headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Served-By', `${SERVICE_NAME} - ${WORKER_ID}`);

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Healthcheck endpoint (used by Kong active healthcheck / circuit breaker)
  if (url.pathname === '/health') {
    res.writeHead(200);
    return res.end(JSON.stringify({
      status: "UP",
      service: SERVICE_NAME,
      worker_id: WORKER_ID,
      timestamp: new Date().toISOString()
    }));
  }

  // Main API endpoint: /api/v1/pajak
  if (url.pathname === '/api/v1/pajak' || url.pathname === '/api/v1/pajak/') {
    // Artificial delay 100ms as per project specification
    setTimeout(() => {
      res.writeHead(200);
      res.end(JSON.stringify({
        status: "success",
        code: 200,
        service: SERVICE_NAME,
        worker_id: WORKER_ID,
        artificial_delay_ms: DELAY_MS,
        timestamp: new Date().toISOString(),
        total_records: mockTaxes.length,
        data: mockTaxes
      }));
    }, DELAY_MS);
    return;
  }

  // Not found
  res.writeHead(404);
  res.end(JSON.stringify({
    status: "error",
    code: 404,
    message: `Endpoint ${url.pathname} tidak ditemukan pada ${SERVICE_NAME}`,
    available_endpoints: ["/health", "/api/v1/pajak"]
  }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[${SERVICE_NAME}] Server running on port ${PORT} with ${DELAY_MS}ms artificial delay`);
});
