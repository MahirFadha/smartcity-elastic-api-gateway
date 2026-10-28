const http = require('http');

const PORT = process.env.PORT || 3000;
const SERVICE_NAME = process.env.SERVICE_NAME || 'Service Kependudukan';
const WORKER_ID = process.env.WORKER_ID || 'Worker 1';
const DELAY_MS = parseInt(process.env.ARTIFICIAL_DELAY_MS || '50', 10);

// Sample mock data for Smart City citizen records
const mockCitizens = [
  { nik: "3201012304950001", nama: "Budi Santoso", alamat: "Jl. Merdeka No. 45, RT 01/RW 03", status: "Warga Tetap", kelurahan: "Sukamaju" },
  { nik: "3201014508980002", nama: "Siti Rahmawati", alamat: "Jl. Melati No. 12, RT 04/RW 02", status: "Warga Tetap", kelurahan: "Harapan Jaya" },
  { nik: "3201016711900003", nama: "Ahmad Hidayat", alamat: "Apartemen City Light Lt. 8", status: "Domisili Sementara", kelurahan: "Menteng Asri" },
  { nik: "3201018902990004", nama: "Dewi Lestari", alamat: "Jl. Mawar No. 7, RT 02/RW 05", status: "Warga Tetap", kelurahan: "Cempaka Putih" }
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

  // Main API endpoint: /api/v1/kependudukan
  if (url.pathname === '/api/v1/kependudukan' || url.pathname === '/api/v1/kependudukan/') {
    // Artificial delay 50ms as per project specification
    setTimeout(() => {
      res.writeHead(200);
      res.end(JSON.stringify({
        status: "success",
        code: 200,
        service: SERVICE_NAME,
        worker_id: WORKER_ID,
        artificial_delay_ms: DELAY_MS,
        timestamp: new Date().toISOString(),
        total_records: mockCitizens.length,
        data: mockCitizens
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
    available_endpoints: ["/health", "/api/v1/kependudukan"]
  }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[${SERVICE_NAME}] Server running on port ${PORT} with ${DELAY_MS}ms artificial delay`);
});
