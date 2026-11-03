CREATE TABLE vat_tu (
    id SERIAL PRIMARY KEY,
    ma_hang VARCHAR(100) NOT NULL UNIQUE,
    ten_hang VARCHAR(255) NOT NULL,
    don_vi_tinh VARCHAR(50),
    gia_nhap_gan_nhat NUMERIC(15,2)
);

CREATE TABLE phieu_nhap (
    id SERIAL PRIMARY KEY,
    ma_phieu VARCHAR(50) NOT NULL UNIQUE,
    nha_cung_cap VARCHAR(255),
    ngay_tao TIMESTAMP NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT | CONFIRMED
    created_by VARCHAR(100)
);

CREATE TABLE phieu_nhap_chi_tiet (
    id SERIAL PRIMARY KEY,
    phieu_nhap_id INT NOT NULL REFERENCES phieu_nhap(id) ON DELETE CASCADE,
    ma_hang VARCHAR(100) NOT NULL,
    ten_hang VARCHAR(255),
    so_luong NUMERIC(12,2) NOT NULL,
    don_gia NUMERIC(15,2) NOT NULL,
    thanh_tien NUMERIC(15,2) GENERATED ALWAYS AS (so_luong * don_gia) STORED
);