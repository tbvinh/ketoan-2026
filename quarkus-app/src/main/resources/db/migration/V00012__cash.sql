-- V00012: Tien mat - phieu thu, phieu chi, phieu doi tien te + so quy
-- Chi THEM file migration moi, KHONG sua V00001..V00011.

CREATE TABLE cash_vouchers (
    id              VARCHAR(36)   PRIMARY KEY,
    code            VARCHAR(20)   NOT NULL,                 -- PT0001 (thu), PC0001 (chi), PD0001 (doi tien te)
    name            VARCHAR(1000) NOT NULL DEFAULT '',      -- dien giai / ly do
    type            VARCHAR(10)   NOT NULL,                 -- receipt | payment | exchange
    doc_date        DATE          NOT NULL DEFAULT CURRENT_DATE,
    partner_id      VARCHAR(36),                            -- doi tuong co the la KH hoac NCC => khong dat FK
    partner_name    VARCHAR(255),                           -- snapshot tai thoi diem lap phieu
    account_id      VARCHAR(36)   REFERENCES accounts(id) ON DELETE RESTRICT,
    amount          BIGINT        NOT NULL DEFAULT 0,       -- gia tri VND (so quy chi theo VND)
    currency        VARCHAR(10)   NOT NULL DEFAULT 'VND',
    amount_currency BIGINT        NOT NULL DEFAULT 0,       -- so luong ngoai te (phieu doi tien te)
    fx_rate         NUMERIC(18,4) NOT NULL DEFAULT 0,       -- ty gia
    source_doc_id   BIGINT        REFERENCES inv_doc(id) ON DELETE SET NULL,
    source_doc_no   VARCHAR(20),                            -- so phieu nhap/xuat nguon
    status          VARCHAR(10)   NOT NULL DEFAULT 'posted',
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_by      VARCHAR(100),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_by      VARCHAR(100),
    CONSTRAINT ck_cash_vouchers_type   CHECK (type IN ('receipt', 'payment', 'exchange')),
    CONSTRAINT ck_cash_vouchers_status CHECK (status IN ('posted', 'cancelled')),
    CONSTRAINT ck_cash_vouchers_amount CHECK (amount >= 0)
);

CREATE UNIQUE INDEX uq_cash_vouchers_code_lower ON cash_vouchers (LOWER(code));
CREATE INDEX idx_cash_vouchers_type_date ON cash_vouchers (type, doc_date DESC);
CREATE INDEX idx_cash_vouchers_date      ON cash_vouchers (doc_date);
CREATE INDEX idx_cash_vouchers_partner   ON cash_vouchers (partner_id);
CREATE INDEX idx_cash_vouchers_source    ON cash_vouchers (source_doc_id);
CREATE INDEX idx_cash_vouchers_name_trgm ON cash_vouchers USING gin (LOWER(name) gin_trgm_ops);

-- Du lieu mau: so du dau quy + thu/chi/doi tien te trong thang
INSERT INTO cash_vouchers (id, code, name, type, doc_date, partner_id, partner_name, account_id, amount, currency, amount_currency, fx_rate, status, created_by) VALUES
(gen_random_uuid()::varchar, 'PT0001', 'Thu tien ban hang theo HD 0001', 'receipt', CURRENT_DATE - 10,
 (SELECT id FROM partners WHERE code = 'DT0001'), (SELECT name FROM partners WHERE code = 'DT0001'),
 (SELECT id FROM accounts WHERE code = '1111'), 15000000, 'VND', 15000000, 0, 'posted', 'admin'),
(gen_random_uuid()::varchar, 'PC0001', 'Chi tien mua van phong pham', 'payment', CURRENT_DATE - 8,
 (SELECT id FROM partners WHERE code = 'DT0002'), (SELECT name FROM partners WHERE code = 'DT0002'),
 (SELECT id FROM accounts WHERE code = '1111'), 1500000, 'VND', 1500000, 0, 'posted', 'admin'),
(gen_random_uuid()::varchar, 'PD0001', 'Doi 1.000 USD sang VND', 'exchange', CURRENT_DATE - 5,
 NULL, 'Khach le', (SELECT id FROM accounts WHERE code = '1111'), 25000000, 'USD', 1000, 25000, 'posted', 'admin'),
(gen_random_uuid()::varchar, 'PT0002', 'Thu tien tam ung hoan lai', 'receipt', CURRENT_DATE - 3,
 NULL, 'Nguyen Van An', (SELECT id FROM accounts WHERE code = '1111'), 5000000, 'VND', 5000000, 0, 'posted', 'admin');
