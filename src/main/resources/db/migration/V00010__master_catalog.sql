-- V00010: Danh muc bo sung - Phong ban, Nhan vien, Don vi tinh, Doi tuong, Ket chuyen
-- Chi THEM file migration moi, KHONG sua V00001..V00009.

-- 10. DEPARTMENTS (Phong ban)
CREATE TABLE departments (
    id      VARCHAR(36)  PRIMARY KEY,
    code    VARCHAR(50),
    name    VARCHAR(255) NOT NULL,
    manager VARCHAR(255),
    phone   VARCHAR(50)
);

CREATE UNIQUE INDEX uq_departments_code_lower ON departments (LOWER(code)) WHERE code IS NOT NULL;
CREATE INDEX idx_departments_name_lower    ON departments (LOWER(name));
CREATE INDEX idx_departments_code_trgm     ON departments USING gin (LOWER(code) gin_trgm_ops);
CREATE INDEX idx_departments_name_trgm     ON departments USING gin (LOWER(name) gin_trgm_ops);
CREATE INDEX idx_departments_manager_trgm  ON departments USING gin (LOWER(manager) gin_trgm_ops);

-- 11. EMPLOYEES (Nhan vien)
CREATE TABLE employees (
    id            VARCHAR(36)  PRIMARY KEY,
    code          VARCHAR(50),
    name          VARCHAR(255) NOT NULL,
    phone         VARCHAR(50),
    email         VARCHAR(255),
    position      VARCHAR(255),
    department_id VARCHAR(36),
    CONSTRAINT fk_employees_department FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX uq_employees_code_lower ON employees (LOWER(code)) WHERE code IS NOT NULL;
CREATE INDEX idx_employees_name_lower      ON employees (LOWER(name));
CREATE INDEX idx_employees_department_id   ON employees (department_id);
CREATE INDEX idx_employees_code_trgm       ON employees USING gin (LOWER(code) gin_trgm_ops);
CREATE INDEX idx_employees_name_trgm       ON employees USING gin (LOWER(name) gin_trgm_ops);
CREATE INDEX idx_employees_phone_trgm      ON employees USING gin (LOWER(phone) gin_trgm_ops);
CREATE INDEX idx_employees_email_trgm      ON employees USING gin (LOWER(email) gin_trgm_ops);

-- 12. UNITS OF MEASURE (Don vi tinh)
CREATE TABLE units (
    id   VARCHAR(36)  PRIMARY KEY,
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL
);

CREATE UNIQUE INDEX uq_units_code_lower ON units (LOWER(code)) WHERE code IS NOT NULL;
CREATE INDEX idx_units_name_lower ON units (LOWER(name));
CREATE INDEX idx_units_code_trgm  ON units USING gin (LOWER(code) gin_trgm_ops);
CREATE INDEX idx_units_name_trgm  ON units USING gin (LOWER(name) gin_trgm_ops);

-- 13. PARTNERS / ENTITIES (Doi tuong)
CREATE TABLE partners (
    id      VARCHAR(36)  PRIMARY KEY,
    code    VARCHAR(50),
    name    VARCHAR(255) NOT NULL,
    phone   VARCHAR(50),
    address VARCHAR(500),
    kind    VARCHAR(20)  NOT NULL DEFAULT 'other',
    CONSTRAINT ck_partners_kind CHECK (kind IN ('customer', 'supplier', 'both', 'other'))
);

CREATE UNIQUE INDEX uq_partners_code_lower ON partners (LOWER(code)) WHERE code IS NOT NULL;
CREATE INDEX idx_partners_name_lower      ON partners (LOWER(name));
CREATE INDEX idx_partners_kind            ON partners (kind);
CREATE INDEX idx_partners_code_trgm       ON partners USING gin (LOWER(code) gin_trgm_ops);
CREATE INDEX idx_partners_name_trgm       ON partners USING gin (LOWER(name) gin_trgm_ops);
CREATE INDEX idx_partners_phone_trgm      ON partners USING gin (LOWER(phone) gin_trgm_ops);
CREATE INDEX idx_partners_address_trgm    ON partners USING gin (LOWER(address) gin_trgm_ops);

-- 14. CLOSING ENTRIES (Ket chuyen)
CREATE TABLE closing_entries (
    id           VARCHAR(36)  PRIMARY KEY,
    code         VARCHAR(50),
    name         VARCHAR(255) NOT NULL,
    from_account VARCHAR(50),
    to_account   VARCHAR(50),
    description  VARCHAR(500)
);

CREATE UNIQUE INDEX uq_closing_entries_code_lower ON closing_entries (LOWER(code)) WHERE code IS NOT NULL;
CREATE INDEX idx_closing_entries_name_lower  ON closing_entries (LOWER(name));
CREATE INDEX idx_closing_entries_code_trgm   ON closing_entries USING gin (LOWER(code) gin_trgm_ops);
CREATE INDEX idx_closing_entries_name_trgm   ON closing_entries USING gin (LOWER(name) gin_trgm_ops);

-- Du lieu mau
INSERT INTO departments (id, code, name, manager, phone) VALUES
(gen_random_uuid()::varchar, 'PB-KT', 'Phòng Kế toán', 'Trần Thị Hoa', '024 3852 1188'),
(gen_random_uuid()::varchar, 'PB-KHO', 'Phòng Kho vận', 'Nguyễn Văn Bình', '024 3852 1199'),
(gen_random_uuid()::varchar, 'PB-KD', 'Phòng Kinh doanh', 'Lê Minh Châu', '028 3822 3377'),
(gen_random_uuid()::varchar, 'PB-NS', 'Phòng Nhân sự', 'Phạm Thu Dung', '024 3852 1177');

INSERT INTO employees (id, code, name, phone, email, position, department_id) VALUES
(gen_random_uuid()::varchar, 'NV0001', 'Nguyễn Văn An', '090 123 4567', 'an.nguyen@ketoan.vn', 'Kế toán trưởng', (SELECT id FROM departments WHERE code = 'PB-KT')),
(gen_random_uuid()::varchar, 'NV0002', 'Trần Thị Bích', '091 234 5678', 'bich.tran@ketoan.vn', 'Kế toán viên', (SELECT id FROM departments WHERE code = 'PB-KT')),
(gen_random_uuid()::varchar, 'NV0003', 'Lê Hoàng Cường', '092 345 6789', 'cuong.le@ketoan.vn', 'Thủ kho', (SELECT id FROM departments WHERE code = 'PB-KHO')),
(gen_random_uuid()::varchar, 'NV0004', 'Phạm Thu Dung', '093 456 7890', 'dung.pham@ketoan.vn', 'Trưởng phòng Nhân sự', (SELECT id FROM departments WHERE code = 'PB-NS')),
(gen_random_uuid()::varchar, 'NV0005', 'Võ Minh Đức', '094 567 8901', 'duc.vo@ketoan.vn', 'Nhân viên kinh doanh', (SELECT id FROM departments WHERE code = 'PB-KD'));

INSERT INTO units (id, code, name) VALUES
(gen_random_uuid()::varchar, 'DVT001', 'Cái'),
(gen_random_uuid()::varchar, 'DVT002', 'Chiếc'),
(gen_random_uuid()::varchar, 'DVT003', 'Bộ'),
(gen_random_uuid()::varchar, 'DVT004', 'Hộp'),
(gen_random_uuid()::varchar, 'DVT005', 'Thùng'),
(gen_random_uuid()::varchar, 'DVT006', 'Kg'),
(gen_random_uuid()::varchar, 'DVT007', 'Mét'),
(gen_random_uuid()::varchar, 'DVT008', 'Lít');

INSERT INTO partners (id, code, name, phone, address, kind) VALUES
(gen_random_uuid()::varchar, 'DT0001', 'Công ty TNHH ABC', '090 1234 567', 'TP. Hồ Chí Minh', 'customer'),
(gen_random_uuid()::varchar, 'DT0002', 'Công ty CP Phong Vũ', '028 7300 8888', 'TP. Hồ Chí Minh', 'supplier'),
(gen_random_uuid()::varchar, 'DT0003', 'Nguyễn Văn Khách', '090 1112 223', 'Hà Nội', 'customer'),
(gen_random_uuid()::varchar, 'DT0004', 'Công ty Digiworld', '028 3915 1919', 'TP. Hồ Chí Minh', 'both');

INSERT INTO closing_entries (id, code, name, from_account, to_account, description) VALUES
(gen_random_uuid()::varchar, 'KC0001', 'Kết chuyển doanh thu', '511', '911', 'Kết chuyển doanh thu bán hàng cuối kỳ'),
(gen_random_uuid()::varchar, 'KC0002', 'Kết chuyển giá vốn', '911', '632', 'Kết chuyển giá vốn hàng bán cuối kỳ'),
(gen_random_uuid()::varchar, 'KC0003', 'Kết chuyển chi phí quản lý', '911', '642', 'Kết chuyển chi phí quản lý doanh nghiệp'),
(gen_random_uuid()::varchar, 'KC0004', 'Kết chuyển lợi nhuận', '911', '421', 'Kết chuyển lợi nhuận sau thuế');
