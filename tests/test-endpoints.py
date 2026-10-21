"""
Skrip Pengujian Cepat API Gateway Smart City (Kelompok 6)
Menguji:
1. Akses normal ke Service Kependudukan & Service Pajak via Gateway (Port 80)
2. Mekanisme Rate Limiting (Memicu HTTP 429 Too Many Requests)
3. Pembacaan Header X-RateLimit-*
"""

import urllib.request
import urllib.error
import json
import time

GATEWAY_BASE = "http://localhost"
ENDPOINTS = [
    ("/api/v1/kependudukan", "Service Kependudukan (Delay 50ms)"),
    ("/api/v1/pajak", "Service Pajak (Delay 100ms)")
]

def print_separator(title):
    print("\n" + "=" * 65)
    print(f" {title}")
    print("=" * 65)

def test_single_request(path, label):
    url = f"{GATEWAY_BASE}{path}"
    print(f"\n[GET] Mengakses: {label}")
    print(f"URL: {url}")
    
    start_time = time.time()
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as response:
            latency = (time.time() - start_time) * 1000
            data = json.loads(response.read().decode('utf-8'))
            
            print(f"[OK] Status Code  : {response.status} OK")
            print(f"[OK] Total Latency: {latency:.2f} ms")
            print(f"[OK] Respon Service: {data.get('service')}")
            print(f"[OK] Delay Buatan : {data.get('artificial_delay_ms')} ms")
            
            # Print Rate Limit Headers
            print(f"• X-RateLimit-Limit-Second    : {response.headers.get('X-RateLimit-Limit-Second')}")
            print(f"• X-RateLimit-Remaining-Second: {response.headers.get('X-RateLimit-Remaining-Second')}")
            return True
    except urllib.error.HTTPError as e:
        latency = (time.time() - start_time) * 1000
        print(f"[FAIL] HTTP Status: {e.code} ({e.reason}) [{latency:.2f} ms]")
        if e.code == 429:
            print("  -> RATE LIMIT AKTIF (Terdeteksi HTTP 429 Too Many Requests)")
        elif e.code == 503:
            print("  -> CIRCUIT BREAKER AKTIF (Service Down / 503 Service Unavailable)")
        return False
    except Exception as e:
        print(f"[FAIL] Error: {e}")
        return False

def test_rate_limiting(path, num_requests=35):
    import concurrent.futures
    url = f"{GATEWAY_BASE}{path}"
    print(f"\nMenembakkan {num_requests} request SERENTAK (Concurrent) ke {path}...")
    success_count = 0
    rate_limited_count = 0
    
    def fetch(_):
        req = urllib.request.Request(url)
        try:
            with urllib.request.urlopen(req, timeout=3) as resp:
                return resp.status
        except urllib.error.HTTPError as e:
            return e.code
        except Exception:
            return 500

    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        results = list(executor.map(fetch, range(num_requests)))
        
    for code in results:
        if code == 200:
            success_count += 1
            print(".", end="", flush=True)
        elif code == 429:
            rate_limited_count += 1
            print("X", end="", flush=True)
        else:
            print(f"[{code}]", end="", flush=True)
    
    print("\n")
    print("Hasil Pengujian:")
    print(f"  - Request Lolos (HTTP 200)       : {success_count}")
    print(f"  - Request Ditolak (HTTP 429 Limit): {rate_limited_count}")
    if rate_limited_count > 0:
        print("  [OK] Mekanisme Traffic Rate Limiting Kong + Redis BERHASIL TERBUKTI!")

if __name__ == "__main__":
    print_separator("PENGUJIAN SISTEM API GATEWAY KELOMPOK 6")
    print("Pastikan 'docker compose up -d' sudah dijalankan sebelum test ini.")
    
    # 1. Test normal endpoints
    print_separator("1. UJI KONEKTIVITAS NORMAL")
    for path, label in ENDPOINTS:
        test_single_request(path, label)
        time.sleep(1)
        
    # 2. Test Rate Limiting
    print_separator("2. UJI TRAFFIC RATE LIMITING")
    test_rate_limiting("/api/v1/kependudukan", num_requests=35)
