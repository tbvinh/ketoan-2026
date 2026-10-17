-- Kho nhập / kho xuất của phiếu kho (snapshot id + tên, giống đối tác và ngân hàng)
ALTER TABLE inv_doc
    ADD COLUMN warehouse_in_id    varchar(36),
    ADD COLUMN warehouse_in_name  varchar(255),
    ADD COLUMN warehouse_out_id   varchar(36),
    ADD COLUMN warehouse_out_name varchar(255);

ALTER TABLE inv_doc
    ADD CONSTRAINT fk_inv_doc_warehouse_in
        FOREIGN KEY (warehouse_in_id) REFERENCES warehouses(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_inv_doc_warehouse_out
        FOREIGN KEY (warehouse_out_id) REFERENCES warehouses(id) ON DELETE SET NULL;

CREATE INDEX idx_inv_doc_warehouse_in  ON inv_doc (warehouse_in_id);
CREATE INDEX idx_inv_doc_warehouse_out ON inv_doc (warehouse_out_id);
