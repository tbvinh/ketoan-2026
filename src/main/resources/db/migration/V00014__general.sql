-- V00014: Tong hop - phieu ke toan, phieu bu tru cong no, so du kho tinh lai
-- Chi THEM file migration moi, KHONG sua V00001..V00013.

CREATE TABLE general_vouchers (
    id           VARCHAR(36)   PRIMARY KEY,
    code         VARCHAR(20)   NOT NULL,                 -- PK0001 (phieu ke toan), BT0001 (bu tru cong no)
    type         VARCHAR(10)   NOT NULL,
    doc_date     DATE          NOT NULL DEFAULT CURRENT_DATE,
    name         VARCHAR(1000) NOT NULL DEFAULT '',
    partner_id   VARCHAR(36),
    partner_name VARCHAR(255),
    amount       BIGINT        NOT NULL DEFAULT 0,
    status       VARCHAR(10)   NOT NULL DEFAULT 'posted',
    printed_at   TIMESTAMPTZ,
    printed_by   VARCHAR(100),
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_by   VARCHAR(100),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_by   VARCHAR(100),
    CONSTRAINT ck_general_vouchers_type   CHECK (type IN ('journal', 'offset')),
    CONSTRAINT ck_general_vouchers_status CHECK (status IN ('posted', 'cancelled')),
    CONSTRAINT ck_general_vouchers_amount CHECK (amount >= 0)
);

CREATE UNIQUE INDEX uq_general_vouchers_code_lower ON general_vouchers (LOWER(code));
CREATE INDEX idx_general_vouchers_type_date ON general_vouchers (type, doc_date DESC);
CREATE INDEX idx_general_vouchers_date      ON general_vouchers (doc_date);
CREATE INDEX idx_general_vouchers_partner   ON general_vouchers (partner_id);

CREATE TABLE general_voucher_lines (
    id         BIGSERIAL    PRIMARY KEY,
    voucher_id VARCHAR(36)  NOT NULL REFERENCES general_vouchers(id) ON DELETE CASCADE,
    pos        INT          NOT NULL,
    account_id VARCHAR(36)  NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    debit      BIGINT       NOT NULL DEFAULT 0,
    credit     BIGINT       NOT NULL DEFAULT 0,
    note       VARCHAR(500),
    CONSTRAINT ck_general_voucher_lines_debit  CHECK (debit >= 0),
    CONSTRAINT ck_general_voucher_lines_credit CHECK (credit >= 0),
    UNIQUE (voucher_id, pos)
);

CREATE INDEX idx_general_voucher_lines_voucher ON general_voucher_lines (voucher_id);
CREATE INDEX idx_general_voucher_lines_account ON general_voucher_lines (account_id);

-- Tai khoan phuc vu lenh ket chuyen loi lai
INSERT INTO accounts (id, code, name)
SELECT gen_random_uuid()::varchar, '911', 'Xác định kết quả kinh doanh'
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '911');

INSERT INTO accounts (id, code, name)
SELECT gen_random_uuid()::varchar, '421', 'Lợi nhuận sau thuế chưa phân phối'
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '421');

-- So du kho tinh lai (lenh "Tinh lai so du")
CREATE TABLE stock_balances (
    material_id VARCHAR(36)   PRIMARY KEY REFERENCES materials(id) ON DELETE CASCADE,
    qty         NUMERIC(18,3) NOT NULL DEFAULT 0,
    value       NUMERIC(20,2) NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Du lieu mau: 1 phieu ke toan + 1 phieu bu tru cong no
INSERT INTO general_vouchers (id, code, type, doc_date, name, partner_id, partner_name, amount, status, created_by) VALUES
(gen_random_uuid()::varchar, 'PK0001', 'journal', CURRENT_DATE - 4, 'Ket chuyen cong no phai tra', NULL, NULL, 5000000, 'posted', 'admin'),
(gen_random_uuid()::varchar, 'BT0001', 'offset', CURRENT_DATE - 3, 'Bu tru cong no voi Cong ty TNHH ABC',
 (SELECT id FROM partners WHERE code = 'DT0001'), (SELECT name FROM partners WHERE code = 'DT0001'), 10000000, 'posted', 'admin');

INSERT INTO general_voucher_lines (voucher_id, pos, account_id, debit, credit, note)
SELECT g.id, 0, (SELECT id FROM accounts WHERE code = '331'), 5000000, 0, 'No TK 331'
FROM general_vouchers g WHERE g.code = 'PK0001';

INSERT INTO general_voucher_lines (voucher_id, pos, account_id, debit, credit, note)
SELECT g.id, 1, (SELECT id FROM accounts WHERE code = '1121'), 0, 5000000, 'Co TK 1121'
FROM general_vouchers g WHERE g.code = 'PK0001';

INSERT INTO general_voucher_lines (voucher_id, pos, account_id, debit, credit, note)
SELECT g.id, 0, (SELECT id FROM accounts WHERE code = '331'), 10000000, 0, 'No TK 331'
FROM general_vouchers g WHERE g.code = 'BT0001';

INSERT INTO general_voucher_lines (voucher_id, pos, account_id, debit, credit, note)
SELECT g.id, 1, (SELECT id FROM accounts WHERE code = '131'), 0, 10000000, 'Co TK 131'
FROM general_vouchers g WHERE g.code = 'BT0001';
