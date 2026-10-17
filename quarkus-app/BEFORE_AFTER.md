# BEFORE_AFTER.md — Trước & Sau khi áp Fix A (`doc_id` NOT NULL)

> **Ngày:** 17/10/2026 · **Phạm vi:** module Kho (`InvDoc` / `InvLine` / `InvDocResource`)
> **Nguồn:** [`DEBUG_REPORT.md`](./DEBUG_REPORT.md) (phân tích) → [`IMPLEMENTATION_REPORT.md`](./IMPLEMENTATION_REPORT.md) (triển khai)
> **Câu chốt:** *Trước:* Hibernate INSERT dòng hàng **thiếu `doc_id`/`pos`** ⇒ 500. *Sau:* `doc_id` + `pos` nằm **trong cùng câu INSERT** ⇒ 201/200, thứ tự dòng được lưu đúng.

---

## 1. MAPPING JPA

### 1.1 `InvDoc.lines`

```java
// ❌ TRƯỚC — một chiều, collection sở hữu FK
@OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
@JoinColumn(name = "doc_id") @OrderColumn(name = "pos")
public List<InvLine> lines = new ArrayList<>();

// ✅ SAU — hai chiều, InvLine sở hữu FK; thứ tự đọc theo cột pos thật
@OneToMany(mappedBy = "doc", cascade = CascadeType.ALL, orphanRemoval = true)
@OrderBy("pos asc")
public List<InvLine> lines = new ArrayList<>();
```

### 1.2 `InvLine`

```java
// ❌ TRƯỚC — không biết mình thuộc phiếu nào / ở vị trí nào
@Id @GeneratedValue(IDENTITY) public Long id;
public Ref product;   // product_id, product_name
public long qty;
public long price;
@Column(name="line_total", insertable=false, updatable=false) public BigDecimal lineTotal;
// (không có doc_id, không có pos)

// ✅ SAU
@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "doc_id", nullable = false)
@JsonIgnore
public InvDoc doc;

public int pos;
```

### 1.3 Ai sở hữu khoá ngoại?

| | Trước | Sau |
| :--- | :--- | :--- |
| Bên sở hữu `doc_id` | **collection** `InvDoc.lines` (`@JoinColumn` trên `@OneToMany`) | **entity con** `InvLine.doc` (`@ManyToOne @JoinColumn`) |
| Bên sở hữu `pos` | `@OrderColumn` trên collection | field `InvLine.pos` |
| Hibernate biết `doc_id` khi INSERT con? | **Không** | **Có** |
| Kiểu quan hệ | unidirectional one-to-many **with join column** | bidirectional one-to-many (`mappedBy`) |

---

## 2. SQL SINH RA (bằng chứng từ PostgreSQL statement log)

| | Trước (bug) | Sau (fix) |
| :--- | :--- | :--- |
| INSERT dòng hàng | `insert into inv_doc_line (price,product_id,product_name,qty) values (?,?,?,?)`<br>→ **thiếu `doc_id`, `pos`** | `insert into inv_doc_line (doc_id,pos,price,product_id,product_name,qty) values (?,?,?,?,?,?)` |
| Bước tiếp theo | Dự kiến `update inv_doc_line set doc_id=?, pos=? where id=?` — **không bao giờ chạy** vì INSERT đã fail | **Không cần** UPDATE bù |
| Số statement / dòng | 2 (INSERT + UPDATE) | **1 (INSERT)** |
| PUT (thay thế dòng) | INSERT fail ngay ⇒ rollback | `delete from inv_doc_line where id=?` ×n **rồi** `insert …` ×n |
| Kết quả | `ConstraintViolationException` ⇒ **500** | Thành công ⇒ **201/200** |

Minh hoạ log thực tế (sau fix):

```
insert into inv_doc (bank_id,bank_name,doc_date,no,note,partner_id,partner_name,type) values (...)
insert into inv_doc_line (doc_id,pos,price,product_id,product_name,qty) values (...)
insert into inv_doc_line (doc_id,pos,price,product_id,product_name,qty) values (...)
insert into inv_doc_line (doc_id,pos,price,product_id,product_name,qty) values (...)
```

---

## 3. HÀNH VI API (curl test thật)

| Endpoint / bước | Trước | Sau |
| :--- | :--- | :--- |
| `POST /api/inventory/docs` (3 dòng) | **500** — `null value in column "doc_id"` | **201** — `{"id":11,"no":"PN0004", …}` |
| `PUT /api/inventory/docs/{id}` (đảo thứ tự) | **500** — `RollbackException ARJUNA016053` | **200** — trả phiếu với `lines` mới |
| `GET /api/inventory/docs?q=PN0004` | 200 (nhưng chưa từng có phiếu do tạo lỗi) | 200 — `lines` đúng thứ tự `pos` |
| `DELETE /api/inventory/docs/{id}` | 204 (không phụ thuộc bug) | 204 + cascade xoá dòng (`lines_left=0`) |
| Lỗi 500 còn xuất hiện? | Có (mọi lần lưu) | **Không** |

---

## 4. DỮ LIỆU DB

### 4.1 Sau CREATE 3 dòng (thứ tự nhập A, B, C)

| | Trước | Sau |
| :--- | :--- | :--- |
| Dòng được lưu | **0** (rollback) | **3** |
| `doc_id` | — | `11, 11, 11` (**không NULL**) |
| `pos` | — | `0, 1, 2` |
| `line_total` | — | `100.00 / 400.00 / 900.00` (generated) |
| Sequence | bị "đốt" id dù rollback | id dùng đúng cho bản ghi thật |

```
-- SAU (psql -A -t):
0|Line-A|11|1.000|100.00|100.00
1|Line-B|11|2.000|200.00|400.00
2|Line-C|11|3.000|300.00|900.00
-- select count(*) from inv_doc_line where doc_id is null  →  0
```

### 4.2 Sau PUT đảo thứ tự thành C, A, B

| | Trước | Sau |
| :--- | :--- | :--- |
| Dòng | không đổi được | 3 dòng **mới** (id 25/26/27), dòng cũ bị xoá |
| `pos` | — | `0=C`, `1=A`, `2=B` |
| `UNIQUE(doc_id,pos)` | — | Không vi phạm (xoá trước, chèn sau) |

---

## 5. JSON REQUEST / RESPONSE

**Request** — **không đổi** (FE vẫn gửi mảng `lines`, không cần `doc_id`/`pos`):

```json
{"type":"import","date":"2026-10-16","partner":{"id":"p-1","name":"NCC Verify"},
 "lines":[{"product":{"id":"…","name":"Line-A"},"qty":1,"price":100}]}
```

**Response** — **thêm field `pos`** trong mỗi dòng (dữ liệu, không phải hợp đồng mới):

```jsonc
// TRƯỚC: không có trường hợp thành công để so sánh (luôn 500)
// SAU:
{"id":11,"no":"PN0004","type":"import",
 "lines":[{"id":22,"lineTotal":null,"product":{"id":"…","name":"Line-A"},"qty":1,"price":100,"pos":0}]}
```

| Điểm | Trước | Sau |
| :--- | :--- | :--- |
| `lines[].pos` | — | **có** (0..n-1) — FE bỏ qua |
| `lines[].doc` | — | **không xuất hiện** (`@JsonIgnore`) |
| `{items,total}` | giữ nguyên | giữ nguyên |
| `lineTotal` | (luôn 500) | vẫn `null` ngay sau ghi (nợ 11.2 của DEBUG_REPORT) |

---

## 6. MA TRẬN THAY ĐỔI

| Hạng mục | Thay đổi? | Ghi chú |
| :--- | :---: | :--- |
| Schema DB / migration | ❌ | `doc_id`, `pos` vẫn `NOT NULL` (không làm Fix B) |
| Endpoint / route | ❌ | `/api/inventory/docs` giữ nguyên |
| Response shape | ❌ (chỉ thêm `pos`) | FE không phụ thuộc |
| Cách cấp `id`/`no` | ❌ | `count+1`, `PN/PX/PT` như cũ |
| Nghiệp vụ "lưu = thay thế toàn bộ dòng" | ❌ | giữ `cascade=ALL` + `orphanRemoval` |
| Xoá phiếu = cascade xoá dòng | ❌ | đã test |
| Số câu SQL / dòng hàng | ✅ (2 → 1) | hiệu năng tốt hơn |
| Thứ tự dòng được lưu | ✅ (không lưu được → `pos 0..n-1`) | sửa đúng thiết kế |
| `POST`/`PUT` thành công | ✅ (500 → 201/200) | mục tiêu của fix |

---

## 7. FILE THAY ĐỔI

| File | Loại |
| :--- | :--- |
| `src/main/java/com/ketoan/entity/InvDoc.java` | mapping `@OneToMany` |
| `src/main/java/com/ketoan/entity/InvLine.java` | thêm `doc` + `pos` (+ 4 import) |
| `src/main/java/com/ketoan/resource/InvDocResource.java` | `linkLines()` + `em.flush()` |

**Không đổi:** Flyway, FE (`src/main/webui`), service, config, tài liệu khác.

---

## 8. ROLLBACK (nếu cần)

```
1) InvDoc.lines  → trả lại @JoinColumn("doc_id") + @OrderColumn("pos")
2) InvLine       → xoá field doc/pos + 4 import
3) InvDocResource→ bỏ linkLines, trả về d.forEach(l -> l.id = null) và bỏ em.flush()
```
⚠️ Sau rollback, lỗi `doc_id` NULL sẽ quay lại (POST/PUT 500). **Không khuyến nghị** trừ khi có lý do đặc biệt.

---

## 9. TÓM TẮT 1 BẢNG

| Tiêu chí | Trước | Sau |
| :--- | :--- | :--- |
| Tạo phiếu 1–3 dòng | ❌ 500 | ✅ 201 |
| Sửa phiếu (đổi thứ tự) | ❌ 500 | ✅ 200 |
| `doc_id` trong INSERT | ❌ thiếu ⇒ NULL | ✅ có |
| `pos` trong INSERT | ❌ thiếu ⇒ NULL | ✅ có |
| Statement / dòng | 2 (và fail) | 1 |
| Số dòng mồ côi (`doc_id NULL`) | 0 (chỉ vì rollback) | 0 (đúng bản chất) |
| Dữ liệu mất khi lỗi | không (rollback) | không (không còn lỗi) |
| Nghiệp vụ thay đổi | — | **không** |

