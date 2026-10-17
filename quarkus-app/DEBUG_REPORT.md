# DEBUG_REPORT.md — Lỗi `null value in column "doc_id" of relation "inv_doc_line"`

> **Ngày:** 16–17/10/2026 · **Người điều tra:** Cline · **Dự án:** `com.ketoan:quarkus-app` (`1.0.0-SNAPSHOT`)
> **Trạng thái:** ✅ **Đã tái hiện lỗi trên môi trường thật** (Quarkus dev + PostgreSQL 15) và **xác định chính xác root cause**.
> **Phạm vi:** CHỈ điều tra — **KHÔNG sửa source code** (theo yêu cầu). Mọi đoạn code trong §10 là **đề xuất**.
> **Đã đọc trước khi phân tích:** [`.ai/PROJECT_GUIDE.md`](./.ai/PROJECT_GUIDE.md), [`.ai/RULES.md`](./.ai/RULES.md), [`.ai/modules/inventory-agent.md`](./.ai/modules/inventory-agent.md).

## TL;DR

| | |
| :--- | :--- |
| **Lỗi** | `ERROR: null value in column "doc_id" of relation "inv_doc_line" violates not-null constraint` |
| **Xảy ra khi** | `POST /api/inventory/docs` (tạo phiếu) **và** `PUT /api/inventory/docs/{id}` (sửa phiếu) ⇒ **HTTP 500** |
| **Root cause** | `InvDoc.lines` là `@OneToMany(cascade = ALL, orphanRemoval = true)` **một chiều** + `@JoinColumn(name = "doc_id")` + `@OrderColumn(name = "pos")`, trong khi `InvLine` **không map** `doc_id`/`pos`. Hibernate coi **collection là bên sở hữu khoá ngoại** ⇒ nó `INSERT inv_doc_line` **không có** `doc_id`, `pos` rồi mới `UPDATE` bù. Cột `doc_id`/`pos` đang `NOT NULL` ⇒ câu INSERT **đầu tiên** vi phạm. |
| **Bằng chứng vàng** | Câu SQL trong exception: `[insert into inv_doc_line (price,product_id,product_name,qty) values (?,?,?,?)]` — **thiếu `doc_id` và `pos`**; row lỗi `(18, null, null, <product_id>, …, 3.000, 1000.00, 3000.00)` |
| **Fix tối thiểu** | Đưa khoá ngoại & thứ tự về **phía con**: thêm `@ManyToOne @JoinColumn(name="doc_id")` + field `pos` vào `InvLine`; đổi collection thành `@OneToMany(mappedBy = "doc")` + `@OrderBy("pos asc")`; set `line.doc`/`line.pos` khi lưu. **Không cần migration** (§10 – Fix A) |
| **Ảnh hưởng dữ liệu** | Không mất dữ liệu: transaction rollback (đã kiểm chứng 9 phiếu/17 dòng giữ nguyên); chỉ tốn `bigserial` (id nhảy 18→21) |

---

## 1. TRIỆU CHỨNG

| # | Hiện tượng | Ghi chú |
| :- | :--- | :--- |
| 1 | Bấm **Lưu phiếu** ở màn hình Kho ⇒ `alert` lỗi (`inv.saveFailed: …`) | `plugins/inventory/index.jsx` → `saveDoc()` |
| 2 | Server trả **HTTP 500** + `org.hibernate.exception.ConstraintViolationException` | Không phải 400 (validate) — lỗi ở tầng persistence |
| 3 | Lỗi xuất hiện **cả POST (tạo) lẫn PUT (sửa)** | Cả hai đều đi qua cơ chế `cascade persist` của collection |
| 4 | Phiếu **không** được lưu; dữ liệu cũ **không** hỏng | Transaction rollback toàn bộ (§11.4) |
| 5 | Log server chỉ có WARN/ERROR ngắn, **không có SQL log** (`log.sql` chưa bật) — nhưng **câu SQL lỗi nằm ngay trong message exception** | Đủ để kết luận |

---

## 2. TÁI HIỆN (đã thực hiện thật, không suy đoán)

### 2.1 Môi trường

| Thành phần | Giá trị |
| :--- | :--- |
| App | `./mvnw -o quarkus:dev` (Quarkus 3.39.3, Java 21 Temurin) trên **port 8081** (không đụng instance dev của bạn) |
| DB | container tạm `postgres:15`, **port 55435**, `POSTGRES_DB=ke_toan`, user `laravel` (không đụng container `postgres_db` của bạn) |
| Schema + seed | Flyway `migrate-at-start` tự áp `V00001…V00006` ⇒ 9 phiếu / 17 dòng mẫu |
| Override DB | `-Dquarkus.datasource.jdbc.url=jdbc:postgresql://localhost:55435/ke_toan` |
| Auth | `POST /api/auth/loginv1` (`admin`/`123`) ⇒ cookie `token` (endpoint kho đã có `@Authenticated`) |

### 2.2 Các bước tái hiện

```bash
docker run -d --name ketoan-bugdb -e POSTGRES_PASSWORD=secret -e POSTGRES_USER=laravel \
           -e POSTGRES_DB=ke_toan -p 55435:5432 postgres:15
./mvnw -o quarkus:dev -Dquarkus.http.port=8081 \
       -Dquarkus.datasource.jdbc.url=jdbc:postgresql://localhost:55435/ke_toan

curl -c /tmp/c.txt -X POST localhost:8081/api/auth/loginv1 \
     -H 'Content-Type: application/json' -d '{"username":"admin","password":"123"}'
curl -b /tmp/c.txt "localhost:8081/api/materials?page=1&pageSize=1"
#  → id = 58d2dc42-2dba-4cff-94b0-41abe48d7a9b (Cát vàng xây tô)

curl -b /tmp/c.txt -i -X POST localhost:8081/api/inventory/docs \
     -H 'Content-Type: application/json' -d '{
       "type":"import","date":"2026-10-16","note":"repro doc_id null",
       "partner":{"id":"p-1","name":"NCC Repro"},
       "lines":[{"product":{"id":"58d2dc42-2dba-4cff-94b0-41abe48d7a9b",
                            "name":"Cát vàng xây tô"},"qty":3,"price":1000}]}'
#  → HTTP/1.1 500 Internal Server Error
```

### 2.3 Kết quả

| Thao tác | HTTP | Kết quả DB |
| :--- | :---: | :--- |
| `POST /api/inventory/docs` (1 dòng) | **500** | rollback, không có bản ghi |
| `POST` lần 2 | **500** | rollback |
| `PUT /api/inventory/docs/9` (sửa PT0003, 1 dòng) | **500** | rollback; phiếu 9 + dòng cũ **nguyên vẹn** |
| `GET /api/inventory/docs` | 200 | 9 phiếu / 17 dòng (không đổi sau các lần lỗi) |

---

## 3. PHÂN TÍCH STACK TRACE

### 3.1 Chuỗi ngoại lệ (POST)

```
org.hibernate.exception.ConstraintViolationException:
    could not execute statement
    [ERROR: null value in column "doc_id" of relation "inv_doc_line" violates not-null constraint
     Detail: Failing row contains (18, null, null, 58d2dc42-…, Cát vàng xây tô, 3.000, 1000.00, 3000.00).]
    [insert into inv_doc_line (price,product_id,product_name,qty) values (?,?,?,?)]
  ↳ org.postgresql.util.PSQLException: ERROR: null value in column "doc_id" … violates not-null constraint
      ↳ io.agroal.pool.wrapper.PreparedStatementWrapper.executeUpdate
      ↳ org.hibernate.engine.jdbc.internal.ResultSetReturnImpl.executeUpdate
      … 88 more
```

### 3.2 Điểm phát sinh trong code

| Đường | Điểm ném lỗi thực tế | Ghi chú |
| :--- | :--- | :--- |
| **POST** | `InvDocResource.create()` dòng **116** — `d.persist();` | Dev mode chỉ ra `Exception in InvDocResource.java:116` |
| **PUT** | `InvDocResource.update()` dòng **127** — `return d;` ⇒ lỗi nổi lên lúc **commit** | Bọc bởi `jakarta.transaction.RollbackException: ARJUNA016053: Could not commit transaction` rồi `io.quarkus.arc.ArcUndeclaredThrowableException` (method không khai báo `throws`) |
| Tầng Hibernate | `ResultSetReturnImpl.executeUpdate` (INSERT `inv_doc_line`) | Mapping **hợp lệ lúc khởi động**; lỗi nằm ở **thứ tự ghi dữ liệu**, không phải thiếu cột/cấu hình |

### 3.3 Diễn giải `Failing row`

Thứ tự cột `inv_doc_line` theo `V00005`: `(id, doc_id, pos, product_id, product_name, qty, price, line_total)`.

```
(18,        null, null,  58d2dc42-…,  'Cát vàng xây tô', 3.000,  1000.00, 3000.00)
  id      doc_id  pos   product_id      product_name       qty     price   line_total
```

⇒ **`doc_id` và `pos` đều NULL** trong INSERT ⇒ Hibernate **không đưa hai cột này** vào câu INSERT (khớp câu SQL trong message).
⇒ `product_id/product_name/qty/price` **có** giá trị (map trực tiếp trên `InvLine`) ⇒ **loại trừ** nguyên nhân do FE gửi thiếu dữ liệu / DTO / Jackson.
⇒ `line_total = 3000.00` ⇒ cột generated hoạt động bình thường (qty × price).

---

## 4. PHÂN TÍCH `InvDoc` ENTITY

File: `src/main/java/com/ketoan/entity/InvDoc.java`

| Annotation / field | Dòng | Ý nghĩa & tác động |
| :--- | :---: | :--- |
| `@Entity @Table(name = "inv_doc")` | 19 | Ánh xạ bảng master |
| `@Id @GeneratedValue(IDENTITY) public Long id` | 21 | `bigserial`; ID do DB cấp ⇒ phải INSERT cha trước khi biết id |
| `@Column(name="doc_date") public LocalDate date` | 22 | Khớp `doc_date` |
| `@Embedded @AttributeOverrides(...) public Ref partner/bank` | 27–35 | Snapshot `{id,name}` → `partner_id/partner_name`, `bank_id/bank_name` |
| **`@OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)`** | **40** | Quan hệ **một chiều** (KHÔNG `mappedBy`) ⇒ Hibernate coi **collection là bên sở hữu FK** |
| **`@JoinColumn(name = "doc_id")`** | **41** | Tên cột FK do **collection** quản lý, **không** map vào entity con |
| **`@OrderColumn(name = "pos")`** | **41** | `pos` cũng do **collection** quản lý (không phải field của `InvLine`) |
| `public List<InvLine> lines = new ArrayList<>()` | 42 | Danh sách con |

**Điểm mấu chốt:** với `@OneToMany` **không có `mappedBy`**, JPA/Hibernate hiểu đây là quan hệ mà **phía cha giữ khoá ngoại trong bảng con** (một dạng "one-to-many với join column"). Vì `InvLine` không có thuộc tính nào ánh xạ `doc_id`, Hibernate **không thể** ghi FK trong `INSERT` của con; nó phải ghi **sau**, bằng `UPDATE`.

---

## 5. PHÂN TÍCH `InvLine` ENTITY

File: `src/main/java/com/ketoan/entity/InvLine.java`

| Field | Dòng | Cột DB | Có map `doc_id`/`pos`? |
| :--- | :---: | :--- | :---: |
| `@Id @GeneratedValue(IDENTITY) Long id` | 25 | `id` | — |
| `@Column(name="line_total", insertable=false, updatable=false) BigDecimal lineTotal` | 26 | `line_total` (generated) | — |
| `@Embedded Ref product` (`product_id`, `product_name`) | 28–31 | `product_id`, `product_name` | — |
| `long qty` | 33 | `qty numeric(18,3)` | — |
| `long price` | 34 | `price numeric(18,2)` | — |
| **`doc_id`** | — | `doc_id bigint NOT NULL` | ❌ **KHÔNG có field/mapping** |
| **`pos`** | — | `pos int NOT NULL` | ❌ **KHÔNG có field/mapping** |

⇒ `InvLine` **không biết** mình thuộc phiếu nào và **không biết** thứ tự của mình. Đó là gốc rễ của việc Hibernate phải dùng 2 câu lệnh cho mỗi dòng.

---

## 6. PHÂN TÍCH JPA MAPPINGS (ai sở hữu khoá ngoại?)

```
┌─────────────────────────────┐            ┌──────────────────────────────┐
│ InvDoc (inv_doc)            │            │ InvLine (inv_doc_line)       │
│  @OneToMany                 │  1      n  │  @Id id                      │
│    cascade = ALL            │───────────▶│  Ref product (product_id,    │
│    orphanRemoval = true     │            │                product_name) │
│    @JoinColumn("doc_id")    │            │  long qty · long price       │
│    @OrderColumn("pos")      │            │  BigDecimal lineTotal        │
│  List<InvLine> lines        │            │  ❌ KHÔNG có doc / doc_id     │
└─────────────────────────────┘            │  ❌ KHÔNG có pos              │
        ▲ "phía sở hữu FK"                 └──────────────────────────────┘
        └── quan hệ MỘT CHIỀU: chỉ InvDoc biết tới association
```

| Câu hỏi | Trả lời | Hệ quả |
| :--- | :--- | :--- |
| Quan hệ 1–n có `mappedBy` không? | ❌ **Không** | Hibernate coi đây là association **unidirectional one-to-many with join column** |
| Bên nào "sở hữu" FK theo JPA? | **Phía collection (`InvDoc.lines`)** | FK chỉ được ghi qua thao tác trên collection, **không** qua INSERT của `InvLine` |
| `InvLine` có biết `doc_id`? | ❌ Không | Không thể đưa `doc_id` vào `INSERT` của con |
| Có cần join table? | ❌ Không (có `@JoinColumn`) | FK nằm ngay bảng con — nhưng **không** được ghi cùng INSERT |
| Thứ tự Hibernate thực hiện | 1) `INSERT inv_doc` (lấy id) → 2) cascade persist từng `InvLine` ⇒ `INSERT inv_doc_line (price, product_id, product_name, qty)` → 3) *dự kiến* `UPDATE inv_doc_line SET doc_id=?, pos=? WHERE id=?` | Bước 2 **chết** vì `doc_id`/`pos` NOT NULL |

---

## 7. PHÂN TÍCH `@OneToMany` / `@ManyToOne` / `@JoinColumn` / CASCADE

| Thành phần | Hiện trạng | Đúng/Sai | Giải thích |
| :--- | :--- | :---: | :--- |
| `@OneToMany` | Có, trên `InvDoc.lines` | ⚠️ Hợp lệ nhưng **chọn sai kiểu** | Thiếu `mappedBy` ⇒ Hibernate dùng chiến lược 2 bước (insert rồi update) |
| `@ManyToOne` | ❌ **Không có** ở `InvLine` | ❌ Thiếu | Đây chính là thứ khiến FK không thể ghi trong INSERT |
| `@JoinColumn(name="doc_id")` | Có, đặt ở **collection** | ⚠️ Đặt sai phía | `@JoinColumn` nên đặt ở phía **sở hữu** (`@ManyToOne`); đặt ở `@OneToMany` biến collection thành bên sở hữu |
| `cascade = CascadeType.ALL` | Có | ✅ Nhưng **không liên quan** | Cascade chỉ quyết định *có* persist/xoá con hay không; **không** quyết định **cột nào** được ghi trong INSERT |
| `orphanRemoval = true` | Có | ✅ Nhưng làm lỗi ở PUT rõ hơn | `update()` gọi `d.lines.clear()` ⇒ xoá con cũ + chèn con mới ⇒ lại rơi vào chiến lược 2 bước |
| `@OrderColumn(name="pos")` | Có, trên collection | ⚠️ Cùng vấn đề | `pos` không phải field của `InvLine` ⇒ **cũng NULL trong INSERT** (`Failing row`: `pos = null`) |
| `optional=false`/`nullable=false` ở FK | ❌ Không khai (DB đã `NOT NULL`) | ⚠️ Không cứu được | Chỉ ảnh hưởng DDL/validate, **không** đổi thứ tự câu lệnh |

**Vì sao `cascade=ALL` không giúp:** cascade đảm bảo `InvLine` **được** INSERT (nó đã được), nhưng INSERT đó **không chứa** `doc_id` vì entity con không map cột này. Vấn đề là **mapping**, không phải cascade.

---

## 8. VÌ SAO `doc_id` TRỞ THÀNH `NULL`

### 8.1 Cơ chế (theo đúng những gì log chứng minh)

1. `POST /api/inventory/docs` → `d.persist()` (`InvDocResource:116`).
2. `@Id ... IDENTITY` ⇒ Hibernate **INSERT `inv_doc`** ngay để lấy `id`.
3. Cascade `ALL` ⇒ Hibernate **INSERT từng `InvLine`**, nhưng câu INSERT chỉ gồm các cột **có mapping trên `InvLine`**:
   ```sql
   insert into inv_doc_line (price, product_id, product_name, qty) values (?, ?, ?, ?)
   ```
   ⇒ `doc_id` và `pos` **không nằm trong câu lệnh** ⇒ PostgreSQL dùng mặc định = **NULL**.
4. `doc_id`/`pos` là `NOT NULL` ⇒ PostgreSQL từ chối **ngay tại INSERT**: `null value in column "doc_id" … violates not-null constraint` ⇒ abort.
5. Bước 3′ (UPDATE bù `doc_id`, `pos`) **không bao giờ chạy** vì bước 3 đã ném lỗi ⇒ transaction rollback.

### 8.2 Chứng minh bằng thực nghiệm (chỉ đổi **DB tạm**, không sửa code repo)

| Thí nghiệm | Thay đổi | Kết quả | Kết luận |
| :--- | :--- | :--- | :--- |
| Đối chứng | `doc_id`, `pos` **NOT NULL** | POST ⇒ **500**, row lỗi `(18, null, null, …)` | INSERT thiếu cột ⇒ NULL ⇒ vi phạm |
| Thí nghiệm | `ALTER TABLE inv_doc_line ALTER COLUMN doc_id DROP NOT NULL;` + `pos DROP NOT NULL` | POST ⇒ **201 Created** (`no = PN0004`) | Chứng tỏ INSERT **không** mang `doc_id`/`pos` |
| Kiểm tra sau khi cho NULL | query lại bản ghi vừa tạo | `line id=22 → doc_id=13, pos=0`; **0 dòng** `doc_id IS NULL` | Hibernate **đã chạy UPDATE bù** sau INSERT ⇒ xác nhận chiến lược 2 bước |

> Nếu mapping ghi FK trong INSERT thì việc cho phép NULL **không cần thiết** để POST thành công và `doc_id` sẽ có ngay từ đầu. Việc `doc_id`/`pos` **chỉ có giá trị sau khi INSERT xong** chứng minh thứ tự `INSERT → UPDATE`.

---

## 9. ROOT CAUSE (chính xác)

> **Nguyên nhân gốc:** mapping `@OneToMany(cascade = ALL, orphanRemoval = true) + @JoinColumn(name = "doc_id") + @OrderColumn(name = "pos")` trên `InvDoc.lines` (`InvDoc.java:40–42`) là quan hệ **một chiều** — khoá ngoại `doc_id` và cột thứ tự `pos` **không được map trên `InvLine`**. Hibernate do đó sinh `INSERT inv_doc_line` **không có `doc_id`, `pos`** rồi mới `UPDATE` bù; vì `V00005__document.sql:40–41` khai báo cả hai cột **`NOT NULL`**, câu INSERT đầu tiên bị PostgreSQL từ chối ⇒ `ConstraintViolationException` ⇒ HTTP 500.

**Loại trừ các nghi vấn khác (đã kiểm chứng bằng log/repro):**

| Nghi vấn | Kết luận | Căn cứ |
| :--- | :--- | :--- |
| FE gửi thiếu `doc_id`? | ❌ Không phải | FE không gửi FK (đúng thiết kế); `product_id/qty/price` đến đầy đủ |
| Jackson/DTO map sai? | ❌ Không phải | Row lỗi có đủ dữ liệu con; chỉ thiếu 2 cột không có mapping |
| Thiếu `@ManyToOne`? | ✅ **Đây là thiếu sót gốc** | §5 + §6 |
| `cascade`/`orphanRemoval` cấu hình sai? | ❌ Không phải (nhưng làm lỗi lan sang PUT) | §7 |
| Thiếu `@Transactional`? | ❌ Không phải | Annotation đủ; lỗi là SQL |
| Schema lệch entity? | ❌ Không phải | Schema đúng thiết kế; entity thiếu field |

---

## 10. ĐỀ XUẤT FIX TỐI THIỂU

### ✅ Fix A — (khuyến nghị) Đưa FK + thứ tự về **phía con** (không cần migration)

**3 file, không đổi schema** (cột `doc_id`, `pos` đã tồn tại đúng):

```java
// 1) InvDoc.java  (thay dòng 40-42)
@OneToMany(mappedBy = "doc", cascade = CascadeType.ALL, orphanRemoval = true)
@OrderBy("pos asc")                       // giữ thứ tự khi đọc (thay @OrderColumn)
public List<InvLine> lines = new ArrayList<>();
```

```java
// 2) InvLine.java  (thêm import JsonIgnore + FetchType)
@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "doc_id", nullable = false)
@JsonIgnore                                // tránh vòng lặp JSON: InvDoc.lines → InvLine.doc → …
public InvDoc doc;

public int pos;                            // cột pos do app gán = index trong mảng
```

```java
// 3) InvDocResource.java — create() và update()
// create():
for (int i = 0; i < d.lines.size(); i++) { InvLine l = d.lines.get(i); l.id = null; l.doc = d; l.pos = i; }
d.persist();

// update():
d.lines.clear();
for (int i = 0; i < in.lines.size(); i++) { InvLine l = in.lines.get(i); l.id = null; l.doc = d; l.pos = i; d.lines.add(l); }
```

**Vì sao fix này giải quyết triệt để:**
- `InvLine` **sở hữu** FK (`@ManyToOne`) ⇒ Hibernate ghi `doc_id` **ngay trong INSERT** của con (1 câu lệnh).
- `pos` là field thật ⇒ nằm trong cùng INSERT ⇒ `NOT NULL` + `UNIQUE(doc_id,pos)` đều thoả.
- Bỏ `@OrderColumn` (vốn cũng ghi sau bằng UPDATE) ⇒ không còn cột nào bị NULL tạm thời.
- `mappedBy` + `orphanRemoval` giữ nguyên hành vi "thay thế toàn bộ dòng khi sửa".
- `@JsonIgnore` **bắt buộc** để không serialize vòng `InvDoc → lines → doc → lines…`; `pos` vẫn trả ra cho FE (vô hại).

**Kỳ vọng sau fix (cách verify):**
```sql
-- bật quarkus.hibernate-orm.log.sql=true (dev) để xem
insert into inv_doc_line (doc_id, pos, price, product_id, product_name, qty, id) values (?,?,?,?,?,?,?)
--                        ^^^^^^ ^^^^  có CẢ HAI ⇒ không còn NULL
```
- POST + PUT trả `200/201`; `GET /api/inventory/docs` thấy phiếu mới.
- Kéo thả đổi thứ tự ⇒ `pos` = `0..n-1`; `UNIQUE(doc_id,pos)` không vi phạm khi sửa (xoá cũ trước, chèn mới sau).

### ⚠️ Fix B — (hotfix chỉ DB, **đã kiểm chứng chạy được**)
```sql
-- V00007__inv_doc_line_nullable.sql  (KHÔNG khuyến nghị lâu dài)
ALTER TABLE inv_doc_line ALTER COLUMN doc_id DROP NOT NULL;
ALTER TABLE inv_doc_line ALTER COLUMN pos    DROP NOT NULL;
```
- ✅ POST/PUT chạy được ngay (đã test: `201`, dữ liệu đúng sau đó).
- ❌ Mất ràng buộc toàn vẹn: có thể có dòng "mồ côi" (`doc_id NULL`); mỗi dòng tốn **2 câu lệnh**; `UNIQUE(doc_id,pos)` không chặn dòng NULL.
- Chỉ dùng để **mở khoá môi trường dev** trong lúc chờ Fix A.

### ❌ Fix C — (không nên) đổi sang `@JoinTable`
Sai schema (bảng `inv_doc_line` đã có FK), phải migration lớn + đổi truy vấn.

| | Fix A | Fix B | Fix C |
| :--- | :--- | :--- | :--- |
| Số file sửa | 3 (2 entity + 1 resource) | 1 migration | nhiều |
| Cần migration | ❌ không | ✅ có | ✅ có |
| Toàn vẹn dữ liệu | ✅ giữ `NOT NULL` | ❌ mất | ⚠️ đổi mô hình |
| Số câu SQL/dòng | 1 INSERT | 2 (INSERT + UPDATE) | 2 |
| Rủi ro | Thấp (test kéo thả + `UNIQUE`) | Trung bình (nợ dữ liệu) | Cao |

---

## 11. PHÁT HIỆN PHỤ (ngoài phạm vi lỗi, nên sửa kèm)

| # | Phát hiện | Mức | Ghi chú |
| :- | :--- | :--- | :--- |
| 11.1 | **`GET /api/inventory/docs/{id}` trả 405** — resource **không có** method GET theo id, trong khi FE `inventoryApi.get(id)` và tài liệu module vẫn mô tả endpoint này | 🟠 | Đã kiểm chứng `GET_by_id_HTTP=405`. Hoặc thêm `@GET @Path("{id}")`, hoặc xoá hàm khỏi FE client |
| 11.2 | **`lineTotal` trả `null` ngay sau POST** (`"lines":[{"id":22,"lineTotal":null,…}]`) | 🟡 | Cột generated chỉ có giá trị sau khi DB tính; entity không được refresh. Muốn trả đủ ⇒ `em.flush()` + `em.refresh(d)` |
| 11.3 | Mỗi lần lỗi **tiêu tốn `bigserial`** (id nhảy 18→21 dù rollback) | 🟡 | Bình thường với PostgreSQL sequences; chỉ gây "lỗ id" |
| 11.4 | **Rollback an toàn**: sau 3 lần lỗi vẫn 9 phiếu/17 dòng, phiếu 9 nguyên vẹn, 0 dòng mồ côi | ✅ | `@Transactional` làm đúng việc của nó |
| 11.5 | Luồng **PUT** lỗi nổi lên dưới dạng `ArcUndeclaredThrowableException` (khó đọc) | 🟡 | Lỗi ở thời điểm commit; cân nhắc `flush()` sớm trong `update()` + map `PersistenceException` ⇒ 409 (BE-P5) |
| 11.6 | `log.sql` chưa bật ở dev ⇒ khó debug | 🟡 | Đề xuất `%dev.quarkus.hibernate-orm.log.sql=true` |
| 11.7 | Số phiếu vẫn sinh bằng `count(*)+1` (không phải nguyên nhân lỗi này) | 🔴 | Đã ghi `PROJECT_GUIDE` §7.1 #7; `inv_doc_counter` đã sẵn sàng |

---

## 12. XÁC NHẬN "KHÔNG SỬA SOURCE CODE"

| Việc | Trạng thái |
| :--- | :--- |
| File source trong repo bị sửa | **Không có** (chỉ tạo `DEBUG_REPORT.md`) |
| Thay đổi chỉ thực hiện trên | Container Postgres **tạm** `ketoan-bugdb` (port 55435 — **đã xoá**) |
| App dùng để repro | instance dev **tạm** port **8081** (**đã dừng**) — không ảnh hưởng instance dev của bạn |
| Dữ liệu/DB thật của bạn | Không đụng (`postgres_db` không bị chạm; `src/main/webui/dist` không đổi) |

**File đã đọc để phân tích:** `.ai/PROJECT_GUIDE.md`, `.ai/RULES.md`, `.ai/modules/inventory-agent.md`, `entity/InvDoc.java`, `entity/InvLine.java`, `resource/InvDocResource.java`, `db/migration/V00005__document.sql`, `V00006__document_data.sql`, `src/api/inventoryApi.js`.

---

## 13. VIỆC CẦN LÀM SAU KHI ÁP FIX

- [ ] Áp **Fix A** (3 file) — **không** cần migration.
- [ ] Chạy lại repro §2.2 ⇒ kỳ vọng `201`; log/SQL phải có `doc_id, pos` trong **một** câu INSERT.
- [ ] Test **sửa phiếu** (PUT) nhiều lần liên tiếp ⇒ không vi phạm `UNIQUE(doc_id,pos)`, `pos` vẫn `0..n-1`.
- [ ] Test **kéo thả** đổi thứ tự trên UI rồi lưu ⇒ thứ tự đúng sau khi tải lại.
- [ ] Test **xoá phiếu** ⇒ lines bị xoá theo (FK `ON DELETE CASCADE`).
- [ ] Thêm test tích hợp: POST 1 dòng / nhiều dòng, PUT thay dòng, case lỗi thiếu partner ⇒ 400.
- [ ] Cân nhắc sửa kèm 11.1 (405), 11.2 (`lineTotal`), 11.6 (`log.sql`), 11.7 (counter).
- [ ] Cập nhật `.ai/modules/inventory-agent.md` §2/§3 + `.ai/modules/inventory-architect.md` §4 (vòng đời InvLine) + `CHANGELOG.md` sau khi fix.

---

## PHỤ LỤC — Bảng đối chiếu nhanh (thực trạng vs kỳ vọng)

| Hạng mục | Hiện trạng (bug) | Kỳ vọng (sau Fix A) |
| :--- | :--- | :--- |
| Sở hữu `doc_id` | `InvDoc.lines` (`@JoinColumn` trên collection) | `InvLine.doc` (`@ManyToOne @JoinColumn`) |
| Sở hữu `pos` | `@OrderColumn` trên collection | Field `InvLine.pos` |
| INSERT dòng hàng | `insert into inv_doc_line (price, product_id, product_name, qty)` | `insert into inv_doc_line (doc_id, pos, price, product_id, product_name, qty, id)` |
| Số câu lệnh/dòng | 2 (INSERT + UPDATE) — **hỏng ở INSERT** | 1 (INSERT) |
| POST tạo phiếu | **500** | 201 |
| PUT sửa phiếu | **500** (`ARJUNA016053`) | 200 |
| Thứ tự dòng | không ghi được (NULL) | `pos = 0..n-1` |
| Ràng buộc DB | `NOT NULL` bị vi phạm | `NOT NULL` + `UNIQUE(doc_id,pos)` được tôn trọng |





