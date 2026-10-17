-- PostgreSQL: phiếu nhập/xuất/trả kho (master = inv_doc, detail = inv_doc_line)

-- Bộ đếm số phiếu theo loại (PN/PX/PT), tránh trùng khi nhiều người tạo cùng lúc
CREATE TABLE inv_doc_counter (
    type      varchar(10) PRIMARY KEY CHECK (type IN ('import', 'export', 'return')),
    last_no   bigint NOT NULL DEFAULT 0
);
INSERT INTO inv_doc_counter (type) VALUES ('import'), ('export'), ('return');

-- MASTER
CREATE TABLE inv_doc (
    id            bigserial PRIMARY KEY,
    no            varchar(20)  NOT NULL UNIQUE,            -- PN0001, PX0001, PT0001
    type          varchar(10)  NOT NULL CHECK (type IN ('import', 'export', 'return')),

    -- Đối tác: import -> nhà cung cấp, export/return -> khách hàng.
    -- Không đặt FK vì trỏ tới 2 bảng khác nhau; lưu id + tên tại thời điểm lập phiếu.
    partner_id    varchar(36)  NOT NULL,
    partner_name  varchar(255) NOT NULL,

    bank_id       varchar(36)  REFERENCES banks(id) ON DELETE SET NULL,
    bank_name     varchar(255),

    doc_date      date         NOT NULL DEFAULT CURRENT_DATE,
    note          varchar(1000),

    created_at    timestamptz  NOT NULL DEFAULT now(),
    created_by    varchar(100),
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    updated_by    varchar(100)
);

CREATE INDEX idx_inv_doc_type_date ON inv_doc (type, doc_date DESC);
CREATE INDEX idx_inv_doc_date      ON inv_doc (doc_date);
CREATE INDEX idx_inv_doc_partner   ON inv_doc (partner_id);

-- DETAIL
CREATE TABLE inv_doc_line (
    id            bigserial PRIMARY KEY,
    doc_id        bigint       NOT NULL REFERENCES inv_doc(id) ON DELETE CASCADE,
    pos           int          NOT NULL,                    -- thứ tự dòng (kéo thả ở giao diện)
    product_id    varchar(36)  NOT NULL REFERENCES materials(id),
    product_name  varchar(255) NOT NULL,                    -- snapshot, đổi tên vật tư không làm sai phiếu cũ
    qty           numeric(18,3) NOT NULL CHECK (qty > 0),
    price         numeric(18,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    line_total    numeric(20,2) GENERATED ALWAYS AS (qty * price) STORED,
    UNIQUE (doc_id, pos)
);

CREATE INDEX idx_inv_doc_line_doc     ON inv_doc_line (doc_id);
CREATE INDEX idx_inv_doc_line_product ON inv_doc_line (product_id);

-- Sinh số phiếu an toàn khi đồng thời (gọi trong cùng transaction với INSERT inv_doc)
-- SELECT CASE :type WHEN 'import' THEN 'PN' WHEN 'export' THEN 'PX' ELSE 'PT' END
--        || lpad((UPDATE inv_doc_counter SET last_no = last_no + 1 WHERE type = :type RETURNING last_no)::text, 4, '0');
-- (Trong Java: UPDATE ... RETURNING last_no bằng native query, rồi ghép tiền tố.)