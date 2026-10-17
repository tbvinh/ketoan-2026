-- V00013: Ngan hang - bao co, bao no, phieu luan chuyen tien te + so tien gui
-- Chi THEM file migration moi, KHONG sua V00001..V00012.

CREATE TABLE bank_vouchers (
    id           VARCHAR(36)   PRIMARY KEY,
    code         VARCHAR(20)   NOT NULL,                 -- BC0001 (bao co), BN0001 (bao no), LC0001 (luan chuyen)
    name         VARCHAR(1000) NOT NULL DEFAULT '',      -- dien giai
    type         VARCHAR(10)   NOT NULL,                 -- credit | debit | transfer
    doc_date     DATE          NOT NULL DEFAULT CURRENT_DATE,
    bank_id      VARCHAR(36)   NOT NULL REFERENCES banks(id) ON DELETE RESTRICT,  -- tai khoan ngan hang chinh / ngan hang nguon
    to_bank_id   VARCHAR(36)   REFERENCES banks(id) ON DELETE RESTRICT,           -- ngan hang dich (chi phieu luan chuyen)
    partner_id   VARCHAR(36),                            -- doi tuong co the la KH hoac NCC => khong dat FK
    partner_name VARCHAR(255),                           -- snapshot tai thoi diem lap phieu
    account_id   VARCHAR(36)   REFERENCES accounts(id) ON DELETE RESTRICT,        -- tai khoan doi ung (131, 331, 1121...)
    amount       BIGINT        NOT NULL DEFAULT 0,
    currency     VARCHAR(10)   NOT NULL DEFAULT 'VND',
    status       VARCHAR(10)   NOT NULL DEFAULT 'posted',
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_by   VARCHAR(100),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_by   VARCHAR(100),
    CONSTRAINT ck_bank_vouchers_type   CHECK (type IN ('credit', 'debit', 'transfer')),
    CONSTRAINT ck_bank_vouchers_status CHECK (status IN ('posted', 'cancelled')),
    CONSTRAINT ck_bank_vouchers_amount CHECK (amount >= 0),
    CONSTRAINT ck_bank_vouchers_transfer CHECK (type <> 'transfer' OR (to_bank_id IS NOT NULL AND to_bank_id <> bank_id))
);

CREATE UNIQUE INDEX uq_bank_vouchers_code_lower ON bank_vouchers (LOWER(code));
CREATE INDEX idx_bank_vouchers_type_date ON bank_vouchers (type, doc_date DESC);
CREATE INDEX idx_bank_vouchers_date      ON bank_vouchers (doc_date);
CREATE INDEX idx_bank_vouchers_bank      ON bank_vouchers (bank_id);
CREATE INDEX idx_bank_vouchers_to_bank   ON bank_vouchers (to_bank_id);
CREATE INDEX idx_bank_vouchers_partner   ON bank_vouchers (partner_id);
CREATE INDEX idx_bank_vouchers_name_trgm ON bank_vouchers USING gin (LOWER(name) gin_trgm_ops);

-- Du lieu mau: bao co / bao no / luan chuyen trong thang
INSERT INTO bank_vouchers (id, code, name, type, doc_date, bank_id, to_bank_id, partner_id, partner_name, account_id, amount, currency, status, created_by) VALUES
(gen_random_uuid()::varchar, 'BC0001', 'Khach hang chuyen tien thanh toan HD 0001', 'credit', CURRENT_DATE - 12,
 (SELECT id FROM banks WHERE code = 'VCB'), NULL,
 (SELECT id FROM partners WHERE code = 'DT0001'), (SELECT name FROM partners WHERE code = 'DT0001'),
 (SELECT id FROM accounts WHERE code = '131'), 50000000, 'VND', 'posted', 'admin'),
(gen_random_uuid()::varchar, 'BN0001', 'Chuyen tien tra NCC theo HD 0002', 'debit', CURRENT_DATE - 9,
 (SELECT id FROM banks WHERE code = 'VCB'), NULL,
 (SELECT id FROM partners WHERE code = 'DT0002'), (SELECT name FROM partners WHERE code = 'DT0002'),
 (SELECT id FROM accounts WHERE code = '331'), 12000000, 'VND', 'posted', 'admin'),
(gen_random_uuid()::varchar, 'LC0001', 'Luan chuyen tien tu Vietcombank sang Techcombank', 'transfer', CURRENT_DATE - 6,
 (SELECT id FROM banks WHERE code = 'VCB'), (SELECT id FROM banks WHERE code = 'TCB'),
 NULL, NULL, (SELECT id FROM accounts WHERE code = '1121'), 20000000, 'VND', 'posted', 'admin'),
(gen_random_uuid()::varchar, 'BC0002', 'Khach le nop tien vao tai khoan', 'credit', CURRENT_DATE - 2,
 (SELECT id FROM banks WHERE code = 'TCB'), NULL,
 NULL, 'Khach le', (SELECT id FROM accounts WHERE code = '131'), 8000000, 'VND', 'posted', 'admin');
