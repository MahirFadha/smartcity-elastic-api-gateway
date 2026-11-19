-- ==============================================================================
-- DATABASE PERPAJAKAN SMART CITY INITIALIZATION SCRIPT
-- ==============================================================================
CREATE TABLE IF NOT EXISTS tagihan_pajak (
    id SERIAL PRIMARY KEY,
    nop VARCHAR(30) UNIQUE NOT NULL,
    pemilik VARCHAR(100) NOT NULL,
    jenis_pajak VARCHAR(50) NOT NULL,
    tahun INT NOT NULL,
    jumlah NUMERIC(12, 2) NOT NULL,
    status_bayar VARCHAR(20) NOT NULL,
    jatuh_tempo DATE NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tagihan_nop ON tagihan_pajak(nop);

INSERT INTO tagihan_pajak (nop, pemilik, jenis_pajak, tahun, jumlah, status_bayar, jatuh_tempo) VALUES
('32.01.010.001.002-0045.0', 'Budi Santoso', 'PBB-P2', 2026, 450000.00, 'LUNAS', '2026-08-31'),
('32.01.010.002.003-0112.0', 'Siti Rahmawati', 'PBB-P2', 2026, 320000.00, 'BELUM_LUNAS', '2026-08-31'),
('32.01.010.005.001-0899.0', 'PT Inovasi Kota Digital', 'Pajak Reklame', 2026, 2500000.00, 'LUNAS', '2026-06-30'),
('32.01.010.008.004-0341.0', 'Dewi Lestari', 'Retribusi Sampah & Kebersihan', 2026, 60000.00, 'LUNAS', '2026-12-31')
ON CONFLICT (nop) DO NOTHING;
