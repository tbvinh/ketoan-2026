CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. SUPPLIERS
CREATE TABLE suppliers (
    id      VARCHAR(36)  PRIMARY KEY,
    code    VARCHAR(50),
    name    VARCHAR(255) NOT NULL,
    phone   VARCHAR(50),
    address VARCHAR(500)
);

-- Unique index không phân biệt hoa thường cho code (bỏ qua NULL)
CREATE UNIQUE INDEX uq_suppliers_code_lower ON suppliers (LOWER(code)) WHERE code IS NOT NULL;

-- Index phục vụ sắp xếp theo name
CREATE INDEX idx_suppliers_name_lower ON suppliers (LOWER(name));

-- Index pg_trgm phục vụ tìm kiếm theo keyword (LIKE/ILIKE '%q%')
CREATE INDEX idx_suppliers_code_trgm    ON suppliers USING gin (LOWER(code) gin_trgm_ops);
CREATE INDEX idx_suppliers_name_trgm    ON suppliers USING gin (LOWER(name) gin_trgm_ops);
CREATE INDEX idx_suppliers_phone_trgm   ON suppliers USING gin (LOWER(phone) gin_trgm_ops);
CREATE INDEX idx_suppliers_address_trgm ON suppliers USING gin (LOWER(address) gin_trgm_ops);


-- 2. CUSTOMERS
CREATE TABLE customers (
    id      VARCHAR(36)  PRIMARY KEY,
    code    VARCHAR(50),
    name    VARCHAR(255) NOT NULL,
    phone   VARCHAR(50),
    address VARCHAR(500)
);

CREATE UNIQUE INDEX uq_customers_code_lower ON customers (LOWER(code)) WHERE code IS NOT NULL;

CREATE INDEX idx_customers_name_lower ON customers (LOWER(name));

CREATE INDEX idx_customers_code_trgm    ON customers USING gin (LOWER(code) gin_trgm_ops);
CREATE INDEX idx_customers_name_trgm    ON customers USING gin (LOWER(name) gin_trgm_ops);
CREATE INDEX idx_customers_phone_trgm   ON customers USING gin (LOWER(phone) gin_trgm_ops);
CREATE INDEX idx_customers_address_trgm ON customers USING gin (LOWER(address) gin_trgm_ops);


-- 3. BANKS
CREATE TABLE banks (
    id     VARCHAR(36)  PRIMARY KEY,
    code   VARCHAR(50)  NOT NULL,
    name   VARCHAR(255) NOT NULL,
    branch VARCHAR(255)
);

CREATE UNIQUE INDEX uq_banks_code_lower ON banks (LOWER(code));

CREATE INDEX idx_banks_name_lower ON banks (LOWER(name));

CREATE INDEX idx_banks_code_trgm   ON banks USING gin (LOWER(code) gin_trgm_ops);
CREATE INDEX idx_banks_name_trgm   ON banks USING gin (LOWER(name) gin_trgm_ops);
CREATE INDEX idx_banks_branch_trgm ON banks USING gin (LOWER(branch) gin_trgm_ops);


-- 4. ACCOUNTS
CREATE TABLE accounts (
    id   VARCHAR(36)  PRIMARY KEY,
    code VARCHAR(50)  NOT NULL,
    name VARCHAR(255) NOT NULL
);

CREATE UNIQUE INDEX uq_accounts_code_lower ON accounts (LOWER(code));

CREATE INDEX idx_accounts_name_lower ON accounts (LOWER(name));

CREATE INDEX idx_accounts_code_trgm ON accounts USING gin (LOWER(code) gin_trgm_ops);
CREATE INDEX idx_accounts_name_trgm ON accounts USING gin (LOWER(name) gin_trgm_ops);


-- 5. MATERIAL TYPES
CREATE TABLE material_types (
    id   VARCHAR(36)  PRIMARY KEY,
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL
);

-- Bảng này cột code không dùng nhưng vẫn tạo unique index nếu có dữ liệu
CREATE UNIQUE INDEX uq_material_types_code_lower ON material_types (LOWER(code)) WHERE code IS NOT NULL;

CREATE INDEX idx_material_types_name_lower ON material_types (LOWER(name));

CREATE INDEX idx_material_types_name_trgm ON material_types USING gin (LOWER(name) gin_trgm_ops);


-- 6. MATERIALS
CREATE TABLE materials (
    id      VARCHAR(36)  PRIMARY KEY,
    code    VARCHAR(50),
    name    VARCHAR(255) NOT NULL,
    unit    VARCHAR(50),
    price   BIGINT       NOT NULL DEFAULT 0,
    type_id VARCHAR(36),
    CONSTRAINT fk_materials_type FOREIGN KEY (type_id) REFERENCES material_types (id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX uq_materials_code_lower ON materials (LOWER(code)) WHERE code IS NOT NULL;

CREATE INDEX idx_materials_name_lower ON materials (LOWER(name));
CREATE INDEX idx_materials_type_id    ON materials (type_id);

CREATE INDEX idx_materials_code_trgm ON materials USING gin (LOWER(code) gin_trgm_ops);
CREATE INDEX idx_materials_name_trgm ON materials USING gin (LOWER(name) gin_trgm_ops);