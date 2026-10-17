-- V00018: Anh dai dien cho vat tu/nguoi dung + seed SVG mau (AGV, vat tu, avatar).
ALTER TABLE materials ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- Nhom vat tu AGV / tu dong hoa
INSERT INTO material_types (id, code, name)
SELECT 'mt-006-uuid-0000-000000000006', NULL, 'Robot AGV & Tự động hóa'
WHERE NOT EXISTS (SELECT 1 FROM material_types WHERE id = 'mt-006-uuid-0000-000000000006');

-- San pham AGV mau (idempotent theo code)
INSERT INTO materials (id, code, name, unit, price, type_id, image_url)
SELECT gen_random_uuid()::text, v.code, v.name, v.unit, v.price,
       'mt-006-uuid-0000-000000000006', v.image_url
FROM (VALUES
    ('VT-AGV-500',  'Robot AGV vận chuyển hàng tự động 500kg',   'Chiếc', 285000000, '/uploads/samples/products/agv_robot_01.svg'),
    ('VT-AGV-1000', 'Robot AGV nâng hàng tự động 1000kg',        'Chiếc', 420000000, '/uploads/samples/products/agv_robot_02.svg'),
    ('VT-AGV-SIDE', 'Robot AGV thân thấp (low profile)',         'Chiếc', 310000000, '/uploads/samples/products/agv_robot_side.svg'),
    ('VT-AGV-FORK', 'Xe AGV nâng pallet (forklift)',             'Chiếc', 465000000, '/uploads/samples/products/agv_forklift.svg'),
    ('VT-AGV-TUG',  'Xe AGV tugger kéo đoàn xe hàng',            'Chiếc', 398000000, '/uploads/samples/products/agv_tugger.svg'),
    ('VT-AMR-X1',   'Robot AMR tự hành kho thông minh X1',       'Chiếc', 520000000, '/uploads/samples/products/amr_robot_01.svg')
) AS v(code, name, unit, price, image_url)
WHERE NOT EXISTS (SELECT 1 FROM materials m WHERE LOWER(m.code) = LOWER(v.code));

-- Gan anh SVG mau cho vat tu mac dinh (chi khi chua co anh)
UPDATE materials
SET image_url = CASE
    WHEN code IN ('VT-STEEL-10', 'VT-STEEL-16') THEN '/uploads/samples/catalogs/material_steel.svg'
    WHEN code = 'VT-CEMENT-PCB40' THEN '/uploads/samples/catalogs/material_cement.svg'
    WHEN code IN ('VT-SAND-BUILD', 'VT-BRICK-6C') THEN '/uploads/samples/catalogs/material_brick.svg'
    WHEN code = 'VT-PAINT-WHITE' THEN '/uploads/samples/catalogs/material_paint.svg'
    WHEN code = 'VT-PIPE-PPR63' THEN '/uploads/samples/catalogs/material_electrical.svg'
    ELSE image_url
END
WHERE image_url IS NULL
  AND code IN ('VT-STEEL-10', 'VT-STEEL-16', 'VT-CEMENT-PCB40', 'VT-SAND-BUILD',
               'VT-BRICK-6C', 'VT-PAINT-WHITE', 'VT-PIPE-PPR63');

-- Avatar mac dinh cho tai khoan seed
UPDATE users SET image_url = '/uploads/samples/users/avatar_admin.svg'
WHERE image_url IS NULL AND username = 'admin';
UPDATE users SET image_url = '/uploads/samples/users/avatar_01.svg'
WHERE image_url IS NULL AND username = 'user1';
UPDATE users SET image_url = '/uploads/samples/users/avatar_02.svg'
WHERE image_url IS NULL AND username = 'vinhtran';
