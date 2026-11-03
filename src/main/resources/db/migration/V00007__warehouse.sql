-- 7. WAREHOUSES (Kho hàng)
CREATE TABLE warehouses (
    id      VARCHAR(36)  PRIMARY KEY,
    code    VARCHAR(50),
    name    VARCHAR(255) NOT NULL,
    address VARCHAR(500)
);

CREATE UNIQUE INDEX uq_warehouses_code_lower ON warehouses (LOWER(code)) WHERE code IS NOT NULL;

CREATE INDEX idx_warehouses_name_lower ON warehouses (LOWER(name));

CREATE INDEX idx_warehouses_code_trgm    ON warehouses USING gin (LOWER(code) gin_trgm_ops);
CREATE INDEX idx_warehouses_name_trgm    ON warehouses USING gin (LOWER(name) gin_trgm_ops);
CREATE INDEX idx_warehouses_address_trgm ON warehouses USING gin (LOWER(address) gin_trgm_ops);

INSERT INTO warehouses (id, code, name, address) VALUES
(gen_random_uuid()::varchar, 'WH-HN-01', 'Kho Trung Tâm Hà Nội', 'Số 1 Đống Đa, Quận Đống Đa, Hà Nội'),
(gen_random_uuid()::varchar, 'WH-HN-02', 'Kho Tổng Hợp Long Biên', 'Khu công nghiệp Đài Tư, Quận Long Biên, Hà Nội'),
(gen_random_uuid()::varchar, 'WH-HP-01', 'Kho Cảng Hải Phòng', 'Lô CN5, Khu công nghiệp Đình Vũ, Hải An, Hải Phòng'),
(gen_random_uuid()::varchar, 'WH-BN-01', 'Kho Phân Phối Bắc Ninh', 'Khu công nghiệp VSIP Bắc Ninh, Từ Sơn, Bắc Ninh'),
(gen_random_uuid()::varchar, 'WH-DN-01', 'Kho Trung Chuyển Đà Nẵng', 'Đường số 4, Khu công nghiệp Hòa Khánh, Liên Chiểu, Đà Nẵng'),
(gen_random_uuid()::varchar, 'WH-KH-01', 'Kho Khánh Hòa', 'Quốc lộ 1A, Diên Phú, Diên Khánh, Khánh Hòa'),
(gen_random_uuid()::varchar, 'WH-HCM-01', 'Kho Trung Tâm TP.HCM', 'Số 10 Xa lộ Hà Nội, Thủ Đức, TP. Hồ Chí Minh'),
(gen_random_uuid()::varchar, 'WH-HCM-02', 'Kho Tân Bình', 'Khu công nghiệp Tân Bình, Quận Tân Phú, TP. Hồ Chí Minh'),
(gen_random_uuid()::varchar, 'WH-BD-01', 'Kho Sóng Thần Bình Dương', 'Đường số 2, Khu công nghiệp Sóng Thần 1, Dĩ An, Bình Dương'),
(gen_random_uuid()::varchar, 'WH-DN-02', 'Kho Biên Hòa Đồng Nai', 'Khu công nghiệp Amata, Long Bình, Biên Hòa, Đồng Nai'),
(gen_random_uuid()::varchar, 'WH-CT-01', 'Kho Miền Tây Cần Thơ', 'Khu công nghiệp Trà Nóc, Quận Bình Thủy, Cần Thơ'),
(gen_random_uuid()::varchar, 'WH-KG-01', 'Kho Kiên Giang', 'Số 45 Trần Phú, Rạch Giá, Kiên Giang');