-- V00017: Thong tin cong ty in tren tieu de phieu kho (dia chi, MST, dien thoai).
-- Chi THEM file migration moi, KHONG sua V00016.
ALTER TABLE dmcongty ADD COLUMN IF NOT EXISTS address  VARCHAR(500);
ALTER TABLE dmcongty ADD COLUMN IF NOT EXISTS tax_code VARCHAR(50);
ALTER TABLE dmcongty ADD COLUMN IF NOT EXISTS phone    VARCHAR(50);

-- Du lieu mau cho cong ty hien co (chi dien khi con trong) de ban in du tieu de.
UPDATE dmcongty
SET address  = COALESCE(NULLIF(address, ''),  'Số 1 Đại Cồ Việt, Phường Bách Khoa, Hà Nội'),
    tax_code = COALESCE(NULLIF(tax_code, ''), '0101234567'),
    phone    = COALESCE(NULLIF(phone, ''),    '024 3869 1234');
