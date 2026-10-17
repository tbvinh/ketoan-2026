-- =====================================================================================
-- V00006 — DỮ LIỆU MẪU: PHIẾU KHO (Nhập / Xuất / Trả)
--
-- Mục đích: có sẵn dữ liệu để thử TÌM KIẾM / LỌC / SẮP XẾP / PHÂN TRANG ở server:
--   GET /api/inventory/docs?q=&type=&dateFrom=&dateTo=&page=&pageSize=&sort=&dir=
--
-- Nguyên tắc (RULES.md: BE-F1/F2/F3/F9, BE-P7, CS-S11):
--   1) Chỉ THÊM file migration mới, KHÔNG sửa V00001–V00005.
--   2) Mọi INSERT đều có điều kiện `WHERE NOT EXISTS` ⇒ áp lên DB đã có dữ liệu (hoặc chạy lại
--      sau flyway clean) vẫn không tạo trùng, không vi phạm UNIQUE(no)/UNIQUE(doc_id,pos).
--   3) Tham chiếu danh mục theo MÃ NGHIỆP VỤ (code) vì V00004 sinh id bằng gen_random_uuid().
--   4) Số phiếu PHẢI LIÊN TỤC từ 0001 theo từng loại (PN/PX/PT): code hiện tại sinh số bằng
--      `count(*)+1` (PROJECT_GUIDE §7.1 #7) nên nếu để "lỗ" số thì phiếu tạo kế tiếp sẽ trùng số ⇒ 500.
--   5) Ngày phiếu tính theo CURRENT_DATE (lùi 1–35 ngày) để bộ lọc dateFrom/dateTo luôn có dữ liệu.
-- =====================================================================================

-- =====================================================================================
-- 1. PHIẾU NHẬP KHO (PN) — đối tác là NHÀ CUNG CẤP
-- =====================================================================================

-- PN0001 — Nhập thép (có ngân hàng VCB)
WITH s AS (SELECT id, name FROM suppliers WHERE code = 'NCC-HOAPHAT'),
     b AS (SELECT id, name FROM banks WHERE code = 'VCB')
INSERT INTO inv_doc (no, type, partner_id, partner_name, bank_id, bank_name, doc_date, note)
SELECT 'PN0001', 'import', s.id, s.name, b.id, b.name, CURRENT_DATE - 35,
       'Nhập thép cuộn CB240 cho công trình Coteccons - đợt 1'
FROM s CROSS JOIN b
WHERE NOT EXISTS (SELECT 1 FROM inv_doc d WHERE d.no = 'PN0001');

INSERT INTO inv_doc_line (doc_id, pos, product_id, product_name, qty, price)
SELECT d.id, v.pos, m.id, m.name, v.qty, v.price
FROM inv_doc d
JOIN (VALUES (0, 'VT-STEEL-10',  2000::numeric, 16200::numeric),
             (1, 'VT-STEEL-16',   300::numeric, 240000::numeric)) AS v(pos, code, qty, price) ON true
JOIN materials m ON m.code = v.code
WHERE d.no = 'PN0001'
  AND NOT EXISTS (SELECT 1 FROM inv_doc_line l WHERE l.doc_id = d.id);

-- PN0002 — Nhập xi măng + cát (có ngân hàng VCB)
WITH s AS (SELECT id, name FROM suppliers WHERE code = 'NCC-VICEM'),
     b AS (SELECT id, name FROM banks WHERE code = 'VCB')
INSERT INTO inv_doc (no, type, partner_id, partner_name, bank_id, bank_name, doc_date, note)
SELECT 'PN0002', 'import', s.id, s.name, b.id, b.name, CURRENT_DATE - 28,
       'Nhập xi măng Nghi Sơn PCB40 và cát vàng - kho Thủ Đức'
FROM s CROSS JOIN b
WHERE NOT EXISTS (SELECT 1 FROM inv_doc d WHERE d.no = 'PN0002');

INSERT INTO inv_doc_line (doc_id, pos, product_id, product_name, qty, price)
SELECT d.id, v.pos, m.id, m.name, v.qty, v.price
FROM inv_doc d
JOIN (VALUES (0, 'VT-CEMENT-PCB40', 500::numeric, 89000::numeric),
             (1, 'VT-SAND-BUILD',    120::numeric, 320000::numeric)) AS v(pos, code, qty, price) ON true
JOIN materials m ON m.code = v.code
WHERE d.no = 'PN0002'
  AND NOT EXISTS (SELECT 1 FROM inv_doc_line l WHERE l.doc_id = d.id);

-- PN0003 — Nhập gạch + sơn (KHÔNG có ngân hàng ⇒ kiểm tra nhánh bank = NULL)
WITH s AS (SELECT id, name FROM suppliers WHERE code = 'NCC-VLXD-MINHTAN')
INSERT INTO inv_doc (no, type, partner_id, partner_name, bank_id, bank_name, doc_date, note)
SELECT 'PN0003', 'import', s.id, s.name, NULL, NULL, CURRENT_DATE - 21,
       'Nhập gạch tuynel và sơn nội thất Dulux - cửa hàng Minh Tân'
FROM s
WHERE NOT EXISTS (SELECT 1 FROM inv_doc d WHERE d.no = 'PN0003');

INSERT INTO inv_doc_line (doc_id, pos, product_id, product_name, qty, price)
SELECT d.id, v.pos, m.id, m.name, v.qty, v.price
FROM inv_doc d
JOIN (VALUES (0, 'VT-BRICK-6C',     20000::numeric, 1300::numeric),
             (1, 'VT-PAINT-WHITE',     40::numeric, 1250000::numeric),
             (2, 'VT-CEMENT-PCB40',   100::numeric, 88000::numeric)) AS v(pos, code, qty, price) ON true
JOIN materials m ON m.code = v.code
WHERE d.no = 'PN0003'
  AND NOT EXISTS (SELECT 1 FROM inv_doc_line l WHERE l.doc_id = d.id);

-- =====================================================================================
-- 2. PHIẾU XUẤT KHO (PX) — đối tác là KHÁCH HÀNG
-- =====================================================================================

-- PX0001 — Xuất thép (có ngân hàng TCB)
WITH c AS (SELECT id, name FROM customers WHERE code = 'KH-COTECCONS'),
     b AS (SELECT id, name FROM banks WHERE code = 'TCB')
INSERT INTO inv_doc (no, type, partner_id, partner_name, bank_id, bank_name, doc_date, note)
SELECT 'PX0001', 'export', c.id, c.name, b.id, b.name, CURRENT_DATE - 18,
       'Xuất thép cho công trình Coteccons - giai đoạn 1'
FROM c CROSS JOIN b
WHERE NOT EXISTS (SELECT 1 FROM inv_doc d WHERE d.no = 'PX0001');

INSERT INTO inv_doc_line (doc_id, pos, product_id, product_name, qty, price)
SELECT d.id, v.pos, m.id, m.name, v.qty, v.price
FROM inv_doc d
JOIN (VALUES (0, 'VT-STEEL-10',   800::numeric, 17800::numeric),
             (1, 'VT-STEEL-16',   150::numeric, 262000::numeric)) AS v(pos, code, qty, price) ON true
JOIN materials m ON m.code = v.code
WHERE d.no = 'PX0001'
  AND NOT EXISTS (SELECT 1 FROM inv_doc_line l WHERE l.doc_id = d.id);

-- PX0002 — Xuất sơn + ống nhựa (có ngân hàng TCB)
WITH c AS (SELECT id, name FROM customers WHERE code = 'KH-ANPHONG'),
     b AS (SELECT id, name FROM banks WHERE code = 'TCB')
INSERT INTO inv_doc (no, type, partner_id, partner_name, bank_id, bank_name, doc_date, note)
SELECT 'PX0002', 'export', c.id, c.name, b.id, b.name, CURRENT_DATE - 12,
       'Xuất sơn Dulux và ống nhựa PPR cho công trình An Phong'
FROM c CROSS JOIN b
WHERE NOT EXISTS (SELECT 1 FROM inv_doc d WHERE d.no = 'PX0002');

INSERT INTO inv_doc_line (doc_id, pos, product_id, product_name, qty, price)
SELECT d.id, v.pos, m.id, m.name, v.qty, v.price
FROM inv_doc d
JOIN (VALUES (0, 'VT-PAINT-WHITE', 25::numeric, 1350000::numeric),
             (1, 'VT-PIPE-PPR63',  400::numeric, 205000::numeric)) AS v(pos, code, qty, price) ON true
JOIN materials m ON m.code = v.code
WHERE d.no = 'PX0002'
  AND NOT EXISTS (SELECT 1 FROM inv_doc_line l WHERE l.doc_id = d.id);

-- PX0003 — Xuất vật tư phụ cho khách lẻ (KHÔNG có ngân hàng)
WITH c AS (SELECT id, name FROM customers WHERE code = 'KH-CN-NGUYENANH')
INSERT INTO inv_doc (no, type, partner_id, partner_name, bank_id, bank_name, doc_date, note)
SELECT 'PX0003', 'export', c.id, c.name, NULL, NULL, CURRENT_DATE - 7,
       'Xuất vật tư phụ - khách lẻ Nguyễn Văn Anh, thanh toán tiền mặt'
FROM c
WHERE NOT EXISTS (SELECT 1 FROM inv_doc d WHERE d.no = 'PX0003');

INSERT INTO inv_doc_line (doc_id, pos, product_id, product_name, qty, price)
SELECT d.id, v.pos, m.id, m.name, v.qty, v.price
FROM inv_doc d
JOIN (VALUES (0, 'VT-BRICK-6C',     2000::numeric, 1500::numeric),
             (1, 'VT-CEMENT-PCB40',   20::numeric, 95000::numeric)) AS v(pos, code, qty, price) ON true
JOIN materials m ON m.code = v.code
WHERE d.no = 'PX0003'
  AND NOT EXISTS (SELECT 1 FROM inv_doc_line l WHERE l.doc_id = d.id);

-- =====================================================================================
-- 3. PHIẾU TRẢ HÀNG (PT) — đối tác là KHÁCH HÀNG
-- =====================================================================================

-- PT0001 — Khách trả thép thừa (KHÔNG có ngân hàng)
WITH c AS (SELECT id, name FROM customers WHERE code = 'KH-COTECCONS')
INSERT INTO inv_doc (no, type, partner_id, partner_name, bank_id, bank_name, doc_date, note)
SELECT 'PT0001', 'return', c.id, c.name, NULL, NULL, CURRENT_DATE - 5,
       'Khách trả thép thừa từ công trình Coteccons'
FROM c
WHERE NOT EXISTS (SELECT 1 FROM inv_doc d WHERE d.no = 'PT0001');

INSERT INTO inv_doc_line (doc_id, pos, product_id, product_name, qty, price)
SELECT d.id, v.pos, m.id, m.name, v.qty, v.price
FROM inv_doc d
JOIN (VALUES (0, 'VT-STEEL-10', 120::numeric, 17000::numeric)) AS v(pos, code, qty, price) ON true
JOIN materials m ON m.code = v.code
WHERE d.no = 'PT0001'
  AND NOT EXISTS (SELECT 1 FROM inv_doc_line l WHERE l.doc_id = d.id);

-- PT0002 — Trả xi măng chưa sử dụng (có ngân hàng BIDV)
WITH c AS (SELECT id, name FROM customers WHERE code = 'KH-HOABINH'),
     b AS (SELECT id, name FROM banks WHERE code = 'BIDV')
INSERT INTO inv_doc (no, type, partner_id, partner_name, bank_id, bank_name, doc_date, note)
SELECT 'PT0002', 'return', c.id, c.name, b.id, b.name, CURRENT_DATE - 3,
       'Công trình Hòa Bình trả xi măng chưa sử dụng'
FROM c CROSS JOIN b
WHERE NOT EXISTS (SELECT 1 FROM inv_doc d WHERE d.no = 'PT0002');

INSERT INTO inv_doc_line (doc_id, pos, product_id, product_name, qty, price)
SELECT d.id, v.pos, m.id, m.name, v.qty, v.price
FROM inv_doc d
JOIN (VALUES (0, 'VT-CEMENT-PCB40', 60::numeric, 88000::numeric),
             (1, 'VT-SAND-BUILD',    10::numeric, 315000::numeric)) AS v(pos, code, qty, price) ON true
JOIN materials m ON m.code = v.code
WHERE d.no = 'PT0002'
  AND NOT EXISTS (SELECT 1 FROM inv_doc_line l WHERE l.doc_id = d.id);

-- PT0003 — Trả gạch lỗi (KHÔNG có ngân hàng)
WITH c AS (SELECT id, name FROM customers WHERE code = 'KH-CN-TRANBINH')
INSERT INTO inv_doc (no, type, partner_id, partner_name, bank_id, bank_name, doc_date, note)
SELECT 'PT0003', 'return', c.id, c.name, NULL, NULL, CURRENT_DATE - 1,
       'Chủ thầu Trần Thị Bình trả gạch lỗi (cong vênh)'
FROM c
WHERE NOT EXISTS (SELECT 1 FROM inv_doc d WHERE d.no = 'PT0003');

INSERT INTO inv_doc_line (doc_id, pos, product_id, product_name, qty, price)
SELECT d.id, v.pos, m.id, m.name, v.qty, v.price
FROM inv_doc d
JOIN (VALUES (0, 'VT-BRICK-6C', 500::numeric, 1350::numeric)) AS v(pos, code, qty, price) ON true
JOIN materials m ON m.code = v.code
WHERE d.no = 'PT0003'
  AND NOT EXISTS (SELECT 1 FROM inv_doc_line l WHERE l.doc_id = d.id);

-- =====================================================================================
-- 4. ĐỒNG BỘ BỘ ĐẾM SỐ PHIẾU (inv_doc_counter)
-- Bảng này hiện CHƯA được code dùng (InvDocResource.create dùng `count(*)+1` — xem
-- PROJECT_GUIDE §7.1 #7 / .ai/modules/inventory-architect.md §10.2), nhưng vẫn phải khớp
-- dữ liệu thật để khi chuyển sang dùng counter thì không sinh lại số đã tồn tại.
-- Công thức: lấy max phần số của `no` theo từng loại, giữ giá trị lớn hơn hiện có.
-- =====================================================================================
UPDATE inv_doc_counter c
   SET last_no = GREATEST(
         c.last_no,
         COALESCE((SELECT MAX(NULLIF(REGEXP_REPLACE(d.no, '\D', '', 'g'), '')::bigint)
                     FROM inv_doc d
                    WHERE d.type = c.type), 0));

-- =====================================================================================
-- 5. KIỂM TRA AN TOÀN (không chặn khởi động — chỉ cảnh báo trong log)
-- Nếu danh mục (V00004) chưa có materials/suppliers/customers/banks thì các INSERT ở trên
-- không tạo được gì ⇒ cảnh báo để dev biết mà kiểm tra, thay vì "im lặng không có dữ liệu".
-- =====================================================================================
DO $$
DECLARE
    n_doc bigint := (SELECT count(*) FROM inv_doc);
BEGIN
    IF n_doc = 0 THEN
        RAISE WARNING '[V00006] Không có phiếu kho nào sau khi seed: kiểm tra dữ liệu danh mục (V00004) có materials/suppliers/customers/banks chưa.';
    ELSE
        RAISE NOTICE '[V00006] Dữ liệu phiếu kho sẵn sàng: % phiếu, % dòng hàng.', n_doc, (SELECT count(*) FROM inv_doc_line);
    END IF;
END $$;


