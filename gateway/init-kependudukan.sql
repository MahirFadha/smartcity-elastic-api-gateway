-- ==============================================================================
-- DATABASE KEPENDUDUKAN SMART CITY INITIALIZATION SCRIPT
-- ==============================================================================
CREATE TABLE IF NOT EXISTS warga (
    id SERIAL PRIMARY KEY,
    nik VARCHAR(16) UNIQUE NOT NULL,
    nama VARCHAR(100) NOT NULL,
    alamat TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    kelurahan VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_warga_nik ON warga(nik);

INSERT INTO warga (nik, nama, alamat, status, kelurahan) VALUES
('3201012304950001', 'Budi Santoso', 'Jl. Merdeka No. 45, RT 01/RW 03', 'Warga Tetap', 'Sukamaju'),
('3201014508980002', 'Siti Rahmawati', 'Jl. Melati No. 12, RT 04/RW 02', 'Warga Tetap', 'Harapan Jaya'),
('3201016711900003', 'Ahmad Hidayat', 'Apartemen City Light Lt. 8', 'Domisili Sementara', 'Menteng Asri'),
('3201018902990004', 'Dewi Lestari', 'Jl. Mawar No. 7, RT 02/RW 05', 'Warga Tetap', 'Cempaka Putih')
ON CONFLICT (nik) DO NOTHING;
