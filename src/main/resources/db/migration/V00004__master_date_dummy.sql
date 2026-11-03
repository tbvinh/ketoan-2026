-- Thêm extension phục vụ sinh UUID ngẫu nhiên nếu chưa có
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =================================================================
-- 1. DỮ LIỆU MẪU: MATERIAL TYPES (Loại vật tư)
-- =================================================================
INSERT INTO material_types (id, code, name) VALUES
('mt-001-uuid-0000-000000000001', NULL, 'Sắt thép xây dựng'),
('mt-002-uuid-0000-000000000002', NULL, 'Xi măng - Cát - Sỏi'),
('mt-003-uuid-0000-000000000003', NULL, 'Gạch - Đá ốp lát'),
('mt-004-uuid-0000-000000000004', NULL, 'Sơn & Hóa chất chất chống thấm'),
('mt-005-uuid-0000-000000000005', NULL, 'Thiết bị điện & Nước');


-- =================================================================
-- 2. DỮ LIỆU MẪU: MATERIALS (Vật tư)
-- =================================================================
INSERT INTO materials (id, code, name, unit, price, type_id) VALUES
(gen_random_uuid()::text, 'VT-STEEL-10', 'Thép cuộn CB240-T Ø10', 'Kg', 16500, 'mt-001-uuid-0000-000000000001'),
(gen_random_uuid()::text, 'VT-STEEL-16', 'Thép thanh vằn D16 CB300-V', 'Cây', 245000, 'mt-001-uuid-0000-000000000001'),
(gen_random_uuid()::text, 'VT-CEMENT-PCB40', 'Xi măng Nghi Sơn PCB40', 'Bao', 89000, 'mt-002-uuid-0000-000000000002'),
(gen_random_uuid()::text, 'VT-SAND-BUILD', 'Cát vàng xây tô', 'M3', 320000, 'mt-002-uuid-0000-000000000002'),
(gen_random_uuid()::text, 'VT-BRICK-6C', 'Gạch tuynel 6 lỗ 8x12x20', 'Viên', 1350, 'mt-003-uuid-0000-000000000003'),
(gen_random_uuid()::text, 'VT-PAINT-WHITE', 'Sơn nội thất Dulux EasyClean White 18L', 'Thùng', 1250000, 'mt-004-uuid-0000-000000000004'),
(gen_random_uuid()::text, 'VT-PIPE-PPR63', 'Ống nhựa PPR Ø63x10.5mm Tiền Phong', 'Mét', 185000, 'mt-005-uuid-0000-000000000005');


-- =================================================================
-- 3. DỮ LIỆU MẪU: SUPPLIERS (Nhà cung cấp)
-- =================================================================
INSERT INTO suppliers (id, code, name, phone, address) VALUES
(gen_random_uuid()::text, 'NCC-HOAPHAT', 'Tập đoàn Hòa Phát - CN Miền Nam', '02839100100', '644 Nguyễn Thị Định, P. Thạnh Mỹ Lợi, TP. Thủ Đức, TP.HCM'),
(gen_random_uuid()::text, 'NCC-VICEM', 'Công ty Cổ phần Xi măng Hà Tiên 1', '02838242424', '360 Bến Vân Đồn, Phường 1, Quận 4, TP.HCM'),
(gen_random_uuid()::text, 'NCC-TIENPHONG', 'Công ty Cổ phần Nhựa Tiền Phong', '02253813813', 'Số 222 Mạc Đăng Doanh, P. Hưng Đạo, Q. Dương Kinh, Hải Phòng'),
(gen_random_uuid()::text, 'NCC-DULUX', 'Công ty TNHH Sơn AkzoNobel Việt Nam', '02838221670', 'Lô L12-04, Tầng 12, Vincom Center, 72 Lê Thánh Tôn, Quận 1, TP.HCM'),
(gen_random_uuid()::text, 'NCC-VLXD-MINHTAN', 'Cửa hàng VLXD Minh Tân', '0903123456', '128 Xa Lộ Hà Nội, P. Tân Phú, TP. Thủ Đức, TP.HCM');


-- =================================================================
-- 4. DỮ LIỆU MẪU: CUSTOMERS (Khách hàng)
-- =================================================================
INSERT INTO customers (id, code, name, phone, address) VALUES
(gen_random_uuid()::text, 'KH-COTECCONS', 'Công ty Cổ phần Xây dựng Coteccons', '02835142255', '236/6 Điện Biên Phủ, Phường 17, Bình Thạnh, TP.HCM'),
(gen_random_uuid()::text, 'KH-HOABINH', 'Tập đoàn Xây dựng Hòa Bình', '02839304479', '235 Võ Thị Sáu, Phường Võ Thị Sáu, Quận 3, TP.HCM'),
(gen_random_uuid()::text, 'KH-ANPHONG', 'Công ty Cổ phần Đầu tư Xây dựng An Phong', '02838108088', '24 Thái Văn Lung, P. Bến Nghé, Quận 1, TP.HCM'),
(gen_random_uuid()::text, 'KH-CN-NGUYENANH', 'Anh Nguyễn Văn Anh (Khách lẻ)', '0918888999', '15 Đường số 9, P. Linh Trung, TP. Thủ Đức, TP.HCM'),
(gen_random_uuid()::text, 'KH-CN-TRANBINH', 'Chị Trần Thị Bình (Chủ thầu tư nhân)', '0908777666', '45 Lê Văn Việt, P. Tăng Nhơn Phú A, TP. Thủ Đức, TP.HCM');


-- =================================================================
-- 5. DỮ LIỆU MẪU: BANKS (Ngân hàng)
-- =================================================================
INSERT INTO banks (id, code, name, branch) VALUES
(gen_random_uuid()::text, 'VCB', 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)', 'Chi nhánh TP. Hồ Chí Minh'),
(gen_random_uuid()::text, 'TCB', 'Ngân hàng TMCP Kỹ thương Việt Nam (Techcombank)', 'Chi nhánh Sài Gòn'),
(gen_random_uuid()::text, 'CTG', 'Ngân hàng TMCP Công Thương Việt Nam (VietinBank)', 'Chi nhánh 1 TP.HCM'),
(gen_random_uuid()::text, 'BIDV', 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', 'Chi nhánh Bến Thành'),
(gen_random_uuid()::text, 'MBB', 'Ngân hàng TMCP Quân đội (MB Bank)', 'Chi nhánh Gia Định');


-- =================================================================
-- 6. DỮ LIỆU MẪU: ACCOUNTS (Tài khoản kế toán)
-- =================================================================
INSERT INTO accounts (id, code, name) VALUES
(gen_random_uuid()::text, '1111', 'Tiền mặt Việt Nam Đồng'),
(gen_random_uuid()::text, '1121', 'Tiền gửi Ngân hàng Việt Nam Đồng'),
(gen_random_uuid()::text, '131', 'Phải thu của khách hàng'),
(gen_random_uuid()::text, '152', 'Nguyên liệu, vật liệu'),
(gen_random_uuid()::text, '1561', 'Giá mua hàng hóa'),
(gen_random_uuid()::text, '331', 'Phải trả cho người bán'),
(gen_random_uuid()::text, '5111', 'Doanh thu bán hàng hóa');