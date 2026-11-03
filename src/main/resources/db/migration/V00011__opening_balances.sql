-- V00011: Khai bao dau ky (Opening balances) - 7 nhom
-- Chi THEM file migration moi, KHONG sua V00001..V00010.

CREATE TABLE opening_balances (
    id            VARCHAR(36)  PRIMARY KEY,
    code          VARCHAR(50),
    name          VARCHAR(255) NOT NULL,
    kind          VARCHAR(20)  NOT NULL,
    direction     VARCHAR(20),
    partner_id    VARCHAR(36),
    bank_id       VARCHAR(36),
    account_id    VARCHAR(36),
    material_id   VARCHAR(36),
    employee_id   VARCHAR(36),
    quantity      BIGINT       NOT NULL DEFAULT 0,
    unit_price    BIGINT       NOT NULL DEFAULT 0,
    amount        BIGINT       NOT NULL DEFAULT 0,
    interest_rate NUMERIC(9,2) NOT NULL DEFAULT 0,
    due_date      DATE,
    CONSTRAINT ck_opening_balances_kind CHECK (kind IN ('debt', 'loan', 'bank', 'account', 'material', 'tool', 'advance')),
    CONSTRAINT ck_opening_balances_direction CHECK (direction IS NULL OR direction IN ('receivable', 'payable', 'debit', 'credit')),
    CONSTRAINT fk_opening_balances_partner  FOREIGN KEY (partner_id)  REFERENCES partners(id)  ON DELETE RESTRICT,
    CONSTRAINT fk_opening_balances_bank     FOREIGN KEY (bank_id)     REFERENCES banks(id)     ON DELETE RESTRICT,
    CONSTRAINT fk_opening_balances_account  FOREIGN KEY (account_id)  REFERENCES accounts(id)  ON DELETE RESTRICT,
    CONSTRAINT fk_opening_balances_material FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
    CONSTRAINT fk_opening_balances_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX uq_opening_balances_code_lower ON opening_balances (LOWER(code)) WHERE code IS NOT NULL;
CREATE INDEX idx_opening_balances_kind           ON opening_balances (kind);
CREATE INDEX idx_opening_balances_name_lower     ON opening_balances (LOWER(name));
CREATE INDEX idx_opening_balances_code_trgm      ON opening_balances USING gin (LOWER(code) gin_trgm_ops);
CREATE INDEX idx_opening_balances_name_trgm      ON opening_balances USING gin (LOWER(name) gin_trgm_ops);

-- Du lieu mau cho 7 nhom
INSERT INTO opening_balances (id, code, name, kind, direction, partner_id, bank_id, account_id, material_id, employee_id, quantity, unit_price, amount, interest_rate, due_date) VALUES
(gen_random_uuid()::varchar, 'DK0001', 'Phải thu Công ty TNHH ABC', 'debt', 'receivable', (SELECT id FROM partners WHERE code = 'DT0001'), NULL, NULL, NULL, NULL, 0, 0, 15000000, 0, DATE '2026-12-31'),
(gen_random_uuid()::varchar, 'DK0002', 'Vay vốn Ngân hàng Vietcombank', 'loan', 'credit', NULL, NULL, NULL, NULL, NULL, 0, 0, 500000000, 8.50, DATE '2027-06-30'),
(gen_random_uuid()::varchar, 'DK0003', 'Tiền gửi Vietcombank - TK 0071000123456', 'bank', 'debit', NULL, (SELECT id FROM banks WHERE code = 'VCB'), NULL, NULL, NULL, 0, 0, 120000000, 0, NULL),
(gen_random_uuid()::varchar, 'DK0004', 'Tiền mặt tồn quỹ đầu kỳ', 'account', 'debit', NULL, NULL, (SELECT id FROM accounts WHERE code = '1111'), NULL, NULL, 0, 0, 45000000, 0, NULL),
(gen_random_uuid()::varchar, 'DK0005', 'Thép cuộn CB240-T Ø10 tồn kho', 'material', 'debit', NULL, NULL, NULL, (SELECT id FROM materials WHERE code = 'VT-STEEL-10'), NULL, 1000, 16500, 16500000, 0, NULL),
(gen_random_uuid()::varchar, 'DK0006', 'Máy khoan Bosch GSB 550', 'tool', 'debit', NULL, NULL, NULL, NULL, NULL, 5, 1650000, 8250000, 0, NULL),
(gen_random_uuid()::varchar, 'DK0007', 'Tạm ứng công tác Nguyễn Văn An', 'advance', 'debit', NULL, NULL, NULL, NULL, (SELECT id FROM employees WHERE code = 'NV0001'), 0, 0, 5000000, 0, NULL);
