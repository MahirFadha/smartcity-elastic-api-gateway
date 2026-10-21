import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom Metrics untuk pembuktian di depan dosen
export const rateLimitCount = new Counter('rate_limited_responses_429');
export const successCount = new Counter('successful_responses_200');
export const circuitBreakerCount = new Counter('circuit_breaker_responses_503');
export const reqLatency = new Trend('custom_request_duration');

export const options = {
  // Skenario Ramp-up sesuai ketentuan dosen: 10 -> 100 -> 500 -> 1000 VU (Total 3 Menit)
  stages: [
    { duration: '30s', target: 10 },   // Ramp-up ke 10 VU
    { duration: '30s', target: 100 },  // Ramp-up ke 100 VU
    { duration: '60s', target: 500 },  // Naik ke 500 VU
    { duration: '60s', target: 1000 }, // Puncak lonjakan 1000 VU
  ],
  thresholds: {
    // Target SLA: Latensi p95 < 200ms
    http_req_duration: ['p(95)<200'],
  },
};

const BASE_URL = 'http://localhost';

export default function () {
  // Secara acak mengakses Service Kependudukan atau Service Pajak
  const endpoint = Math.random() < 0.5 ? '/api/v1/kependudukan' : '/api/v1/pajak';
  const url = `${BASE_URL}${endpoint}`;

  const res = http.get(url);
  reqLatency.add(res.timings.duration);

  // Evaluasi status response
  if (res.status === 200) {
    successCount.add(1);
  } else if (res.status === 429) {
    // Terbukti Rate Limiting aktif melindungi backend
    rateLimitCount.add(1);
  } else if (res.status === 503) {
    // Terbukti Circuit Breaker aktif saat disaster recovery
    circuitBreakerCount.add(1);
  }

  check(res, {
    'status is 200 or 429 or 503': (r) => [200, 429, 503].includes(r.status),
  });

  // Jeda sangat singkat antar pemanggilan
  sleep(0.05);
}
