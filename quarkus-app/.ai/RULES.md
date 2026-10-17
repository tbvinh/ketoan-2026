# RULES.md — QUY TẮC PHÁT TRIỂN (dự án KẾ TOÁN 2026)

> **Áp dụng cho:** mọi thay đổi trong repo `com.ketoan:quarkus-app` (backend Quarkus + frontend React trong `src/main/webui`).
> **Chuẩn tham chiếu (bắt buộc đọc trước):** [`PROJECT_GUIDE.md`](../PROJECT_GUIDE.md) — kiến trúc & hiện trạng · [`COMPONENT_MAPPING.md`](../COMPONENT_MAPPING.md) — ánh xạ component · [`PROJECT_STATUS.md`](../PROJECT_STATUS.md) — tiến độ · [`.ai/modules/`](./modules/) — chi tiết từng module · [`CHANGELOG.md`](../CHANGELOG.md).
> **Cập nhật:** 16/10/2026 · **Phiên bản:** `1.0.0-SNAPSHOT`
> **Thứ tự ưu tiên khi mâu thuẫn:** `PROJECT_GUIDE.md` (hiện trạng đã kiểm chứng) → **`RULES.md` (file này)** → [`.clinerules`](./.clinerules) (nguyên tắc chung) → prompt trong `.ai/prompts/`.
> ⚠️ **Các prompt `.ai/prompts/05,06,08` còn ghi "Spring Boot / Repository / MapStruct"** — phần đó **SAI** với repo này; luôn áp dụng `RULES.md`.

**Cách dùng:** mỗi quy tắc có **ID** (vd `BE-R3`). Khi review/commit/viết tài liệu, trích dẫn ID (vd: *"đã tuân thủ BE-R3, FE-ST5"*). Nhãn mức độ: **MUST** (bắt buộc), **MUST NOT** (cấm), **SHOULD** (nên, lệch phải ghi lý do trong comment).

---

## 0. SỰ THẬT NỀN TẢNG — ĐỌC TRƯỚC KHI VIẾT BẤT KỲ DÒNG CODE NÀO

### 0.1 Stack thực tế (KHÔNG phải Spring Boot)

| Hạng mục | Thực tế | Hệ quả khi viết code |
| :--- | :--- | :--- |
| Framework | **Quarkus 3.39.3**, Java 21, RESTEasy Reactive (Jakarta REST) | `jakarta.ws.rs.*`, CDI `@Inject`/`@ApplicationScoped` — **không** `org.springframework.*` |
| Tầng REST | `XxxResource` (`@Path`) | **không** `@RestController`/`@RequestMapping`/`ResponseEntity` |
| Persistence | Hibernate ORM **Panache** (`PanacheEntityBase`, static API) + `EntityManager`/JPQL | **không** `JpaRepository`, **không** `@Transactional` của Spring (dùng `jakarta.transaction.Transactional`) |
| Mapping | Jackson (`ObjectMapper.convertValue/updateValue`) | **không** MapStruct/Lombok |
| Migration | **Flyway** `V0000X__*.sql`, `quarkus.hibernate-orm.database.generation=none` | **không** `ddl-auto`, **không** sửa file migration cũ |
| Auth | SmallRye JWT đọc từ **HttpOnly cookie `token`** + BCrypt | **không** header `Authorization`, **không** Spring Security |
| Frontend | **React 18 + Vite 5** (Quarkus Quinoa), CSS thuần, `fetch` | **không** Axios, **không** React Router, **không** Redux/MUI/Fluent UI |
| FE kiến trúc | **Plugin registry** + store layer + i18n + permission | **không** "Page/Component/Service" kiểu CRA — xem §2 |

### 0.2 Sáu giả định **MUST NOT** dùng (đã gây code sai trong quá khứ)

| # | Giả định sai | Thay bằng |
| :- | :--- | :--- |
| G1 | "Có tầng Repository" (`CustomerRepository`) | `MasterResource<T>` (danh mục), static API Panache (`InvDoc.listAll(...)`), hoặc `EntityManager` + JPQL |
| G2 | "Controller + Service" | `XxxResource` + (tuỳ chọn) `XxxService` — xem BE-R1/BE-R2 |
| G3 | "Dùng DTO cho mọi thứ" | Danh mục/kho hiện trả **entity** (`MasterEntity` con, `InvDoc`); DTO chỉ bắt buộc cho Auth & khi cần — xem BE-R10 |
| G4 | "FE dùng Axios + React Router" | `core/http.js` / `core/api.js` + hash-router `core/router.js` |
| G5 | "Điều hướng bằng `navigate('/x')`" | `setState(patch)` của plugin (state nằm trong `location.hash`) |
| G6 | "Sửa cả `webui-v1`" | **Chỉ** `src/main/webui`. `webui-v1` là bản thử nghiệm **không** được Quinoa build |

### 0.3 Giao thức đọc file trước khi code (tiết kiệm token — `COMPONENT_MAPPING.md` §7)

| Nhiệm vụ | MUST đọc | MUST NOT |
| :--- | :--- | :--- |
| Sửa Kho | `plugins/inventory/index.jsx`, `src/api/inventoryApi.js`, `resource/InvDocResource.java`, `entity/InvDoc.java`, `entity/InvLine.java`, `V00005__document.sql` | quét cả cây repo |
| Sửa danh mục | `plugins/catalog/index.jsx`, `core/masterdata.js`, `resource/MasterResource.java` + Resource cụ thể | đọc plugin khác |
| Sửa auth | `core/auth.jsx`, `core/api.js`, `resource/AuthResource.java`, `service/AuthService.java`, `application.properties` | — |
| Thêm plugin mới | `core/plugins.js`, `core/Shell.jsx`, `plugins/catalog/index.jsx` (làm mẫu) | đọc `webui-v1` |
| Bỏ qua khi tìm code | 8 file backup `*copy*.jsx`, `router copy 2.js`, `router-3.js` | sửa nhầm chúng |

### 0.4 Khi nào **MUST** cập nhật tài liệu

- Đổi/thêm cấu trúc module, contract API, schema DB ⇒ cập nhật `COMPONENT_MAPPING.md` + file trong `.ai/modules/`.
- Mọi thay đổi người dùng thấy được ⇒ thêm mục vào `CHANGELOG.md` (Keep a Changelog: Added/Fixed/Changed).
- Hoàn thành/đổi phạm vi phân hệ ⇒ cập nhật `PROJECT_STATUS.md`.

---

## 1. BACKEND RULES

### 1.1 Resource conventions (danh mục & REST)

| ID | Mức | Quy tắc |
| :--- | :--- | :--- |
| **BE-R1** | MUST | Lớp REST đặt trong `com.ketoan.resource`, tên `<NghiệpVụ>Resource`, có `@Path`. **MUST NOT** đặt tên `Controller`, `Servlet`, `Endpoint`. |
| **BE-R2** | MUST | Danh mục ⇒ `extends MasterResource<T extends MasterEntity>` và **chỉ khai báo hook**. **MUST NOT** viết lại `list/get/create/update/delete`. |
| **BE-R3** | MUST | Nghiệp vụ phức tạp (transaction nhiều bước, sinh số phiếu, validate nặng) ⇒ tách vào `com.ketoan.service` với `@ApplicationScoped` + `jakarta.transaction.Transactional` (mẫu `AuthService`). |
| **BE-R4** | MUST | Class Resource nghiệp vụ có `@Authenticated`. Thao tác ghi/xoá nhạy cảm thêm `@RolesAllowed("admin")` (role **chữ thường**: `admin`/`user`). |
| **BE-R5** | MUST | `@Produces(MediaType.APPLICATION_JSON) @Consumes(MediaType.APPLICATION_JSON)` ở class. |
| **BE-R6** | MUST | Đường dẫn: danh từ số nhiều, kebab-case (`/material-types`, `/inventory/docs`). Hành động phụ dùng `POST /<resource>/<action>` (`bulk-delete`). |
| **BE-R7** | MUST | Danh sách phân trang trả `Map.of("items", items, "total", count)`; tham số chuẩn `q`, `page`, `pageSize`, `sort`, `dir` + filter riêng. `pageSize` chặn trong `[1,100]`. |
| **BE-R8** | MUST | Không có `page/pageSize` ⇒ trả tối đa **10 000** dòng (dropdown) và **ghi rõ** trong comment. |
| **BE-R9** | MUST | Mọi thao tác ghi: `@Transactional` + `validate(...)` + `flushOrConflict(msg)` để lỗi unique/FK ⇒ **409** (không 500). |
| **BE-R10** | MUST | Không trả entity có field nhạy cảm (`User.password`). Danh mục/kho được phép trả entity; **Auth MUST** dùng DTO (`AuthRequest`/`AuthResponse` hoặc DTO mới). |
| **BE-R11** | MUST | Lỗi nghiệp vụ: HTTP đúng nghĩa + body `{"message": "…"}` (tiếng Việt, có nghĩa). **MUST NOT** để lộ stacktrace/`500` cho lỗi người dùng sửa được. |
| **BE-R12** | MUST | Sắp xếp chỉ qua **whitelist** `sortable()`; lọc chỉ qua `Where.and(cond, name, value)` (named parameter). **MUST NOT** nối chuỗi từ input người dùng vào JPQL. |
| **BE-R13** | SHOULD | Logic dùng chung cho ≥2 Resource ⇒ `static` helper hoặc nâng lên `MasterResource` (mẫu `SupplierResource.phoneFilter`). |
| **BE-R14** | MUST NOT | Dùng `em.createNativeQuery` khi JPQL đủ; nếu buộc phải native (vd. `UPDATE … RETURNING last_no`) thì MUST có comment giải thích + lý do. |

**Mẫu chuẩn — thêm danh mục (BE-R2):**
```java
@Path("/warehouses")
public class WarehouseResource extends MasterResource<Warehouse> {
    protected Class<Warehouse> type() { return Warehouse.class; }
    protected List<String> searchFields() { return List.of("code", "name", "address"); }
    protected String codePrefix() { return "KHO"; }              // tự sinh KHO0001
    @Override protected Map<String, String> sortable() {
        return Map.of("code", "e.code", "name", "e.name", "address", "e.address");
    }
    @Override protected void applyFilters(MultivaluedMap<String, String> f, Where w) {
        String a = first(f, "address");
        if (a != null) w.and("lower(e.address) like :addr", "addr", "%" + a.toLowerCase() + "%");
    }
}
```
❌ **Sai (anti-pattern):** tự viết `list()` với `SELECT * FROM warehouses` + nối `sort` vào chuỗi; tạo `WarehouseRepositoryImpl`; đặt `@Path("/warehouse")` (số ít); bỏ `@Authenticated`.

**Bảng hook `MasterResource` (chỉ override khi cần):**

| Hook | Bắt buộc | Ý nghĩa |
| :--- | :---: | :--- |
| `type()` | ✅ | Entity class |
| `searchFields()` | ✅ | Cột cho `q` (tên **field entity**, không phải tên cột) |
| `codePrefix()` | — | Tiền tố mã tự sinh (`NCC`, `KH`, `VT`, `KHO`) |
| `codeRequired()` | — | `true` ⇒ bắt buộc nhập mã (banks, accounts) |
| `from()` | — | JPQL FROM (dùng khi cần join, vd `left join MaterialType t`) |
| `sortable()` | — | Whitelist sort (map key FE → JPQL path) |
| `applyFilters(f, w)` | — | Điều kiện lọc động |
| `normalize(e)` | — | Chuẩn hoá trước khi lưu (`""` → `null` cho select) |
| `validate(e)` | — | Gọi thêm `super.validate(e)` nếu cần giữ kiểm tra mặc định |

### 1.2 Entity conventions

| ID | Mức | Quy tắc |
| :--- | :--- | :--- |
| **BE-E1** | MUST | Package `com.ketoan.entity`; tên class = danh từ số ít PascalCase; bảng khai tường minh `@Table(name = "snake_case")`. |
| **BE-E2** | MUST | **Danh mục** ⇒ `extends MasterEntity` (`@MappedSuperclass` cung cấp `id`/`code`/`name`). **MUST NOT** khai báo lại `@Id`/`@GeneratedValue` ở entity danh mục. |
| **BE-E3** | MUST | Danh mục dùng **UUID `varchar(36)`** sinh trong `@PrePersist` (đã có ở `MasterEntity.generateId()`), **không** dùng sequence. |
| **BE-E4** | MUST | Entity nghiệp vụ/kỹ thuật (khoá số) ⇒ `extends PanacheEntityBase` + `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)`. **MUST NOT** `extends PanacheEntity` (xung đột field `id` đã có sẵn). |
| **BE-E5** | MUST | Field entity là **`public`**, `camelCase`, **không** getter/setter, **không** Lombok. |
| **BE-E6** | MUST | Cột khác quy ước camelCase→snake_case ⇒ khai báo tường minh `@Column(name = "…")` (`type_id`, `doc_date`, `line_total`). |
| **BE-E7** | MUST | Cột do DB sinh (generated/virtual) ⇒ map read-only: `@Column(..., insertable = false, updatable = false)` (mẫu `InvLine.lineTotal`). |
| **BE-E8** | MUST | Snapshot dữ liệu tham chiếu 2 nguồn (đối tác nhập/xuất) ⇒ dùng `@Embeddable` `{id, name}` (mẫu `Ref`) thay vì FK; ghi comment giải thích lý do. |
| **BE-E9** | MUST | Chi tiết (detail) ⇒ `@OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)` + `@JoinColumn(name = "…_id")` + `@OrderColumn(name = "pos")` nếu cần giữ thứ tự. |
| **BE-E10** | MUST | Tiền/số lượng phải khớp kiểu DB: DB `numeric` ⇒ Java **`BigDecimal`**. **MUST NOT** khai `long`/`double` cho tiền (xem BE-E11 + guide §7.1 #9). |
| **BE-E11** | SHOULD | Khi sửa entity lệch kiểu so với DB (như `InvLine.qty/price` = `long` vs `numeric(18,3)`), đổi sang `BigDecimal` và cập nhật cả DTO/FE. |
| **BE-E12** | MUST NOT | Thêm field vào entity mà **không** thêm cột tương ứng bằng migration mới (`generation=none` ⇒ app sẽ lỗi runtime `column does not exist`). |
| **BE-E13** | MUST NOT | Dùng entity của module khác để "tiện"; chỉ tham chiếu qua `id`/`Ref` (tránh coupling) hoặc bằng quan hệ tường minh có FK trong migration. |

**Mẫu chuẩn:**
```java
// Danh mục (BE-E2/E3/E5)
@Entity @Table(name = "warehouses")
public class Warehouse extends MasterEntity {        // có sẵn id (UUID), code, name
    public String address;
}

// Nghiệp vụ có khoá số + tiền (BE-E4/E10)
@Entity @Table(name = "inv_doc_line")
public class InvLine extends PanacheEntityBase {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Embedded @AttributeOverrides({
        @AttributeOverride(name = "id",   column = @Column(name = "product_id")),
        @AttributeOverride(name = "name", column = @Column(name = "product_name"))})
    public Ref product;
    public BigDecimal qty;                                        // numeric(18,3)
    public BigDecimal price;                                      // numeric(18,2)
    @Column(name = "line_total", insertable = false, updatable = false)
    public BigDecimal lineTotal;                                  // generated column
}
```
❌ **Sai:** `public class InvLine extends PanacheEntity { @Id ... }`; `public long price;`; `public String getPrice()`; `@ManyToOne Supplier supplier` trong `inv_doc` (đối tác có 2 loại).

### 1.3 Flyway conventions

| ID | Mức | Quy tắc |
| :--- | :--- | :--- |
| **BE-F1** | MUST | Thư mục `src/main/resources/db/migration`; tên file `V<5 chữ số>__mo_ta_ngan.sql` (`V00006__warehouse.sql`). |
| **BE-F2** | MUST NOT | Sửa/xoá/đổi tên file migration **đã chạy** (Flyway checksum ⇒ app không khởi động). Mọi thay đổi = **file mới**. |
| **BE-F3** | MUST | Mọi thay đổi schema (bảng/cột/index/constraint/seed) đều qua migration; app đặt `generation=none`. |
| **BE-F4** | MUST | Tên bảng `snake_case`; tên cột `snake_case`; khoá chính theo BE-E3/E4. |
| **BE-F5** | MUST | Index đặt tên theo quy ước: `uq_<bảng>_<cột>_lower`, `idx_<bảng>_<cột>`, `idx_<bảng>_<cột>_trgm`. |
| **BE-F6** | MUST | Danh mục MUST có `UNIQUE INDEX ... (LOWER(code))` (bỏ qua `NULL`) — đây là chốt chặn trùng mã cho BE-R9. |
| **BE-F7** | MUST | Cột text dùng cho tìm kiếm ⇒ thêm GIN trgm: `CREATE INDEX ... USING gin (LOWER(col) gin_trgm_ops)` + `CREATE EXTENSION IF NOT EXISTS pg_trgm`. |
| **BE-F8** | MUST | Tiền/số lượng: `numeric(18,3)` (qty), `numeric(18,2)` (price); tổng sinh tự động ⇒ `GENERATED ALWAYS AS (qty * price) STORED`. |
| **BE-F9** | MUST | Ràng buộc nghiệp vụ phải có ở DB: `CHECK (type IN (…))`, `CHECK (qty > 0)`, `CHECK (price >= 0)`, `UNIQUE (doc_id, pos)`, FK `ON DELETE CASCADE` (detail) / `RESTRICT` (danh mục đang dùng). |
| **BE-F10** | SHOULD | Cột audit dùng chung: `created_at timestamptz NOT NULL DEFAULT now()`, `created_by`, `updated_at`, `updated_by` — **và** phải map vào entity nếu muốn ghi (mẫu `inv_doc` hiện chưa map ⇒ không bao giờ được ghi). |
| **BE-F11** | MUST | Thay đổi không tương thích làm theo 3 bước: (a) thêm cột nullable + ghi cả hai, (b) backfill, (c) chuyển code đọc rồi mới bỏ cột cũ (ở migration sau). |
| **BE-F12** | MUST | Thêm loại/giá trị mới vào cột `CHECK` ⇒ tạo migration `DROP CONSTRAINT` + `ADD CONSTRAINT` (không sửa file cũ). |
| **BE-F13** | MUST NOT | Dùng `sql/sql-0001.sql` (script tham chiếu) để đổi DB — chỉ Flyway (tránh lệch `flyway_schema_history`). |

**Mẫu migration mới (thêm danh mục `warehouses`):**
```sql
-- V00006__warehouse.sql
CREATE TABLE warehouses (
    id      VARCHAR(36)  PRIMARY KEY,
    code    VARCHAR(50),
    name    VARCHAR(255) NOT NULL,
    address VARCHAR(500)
);
CREATE UNIQUE INDEX uq_warehouses_code_lower ON warehouses (LOWER(code)) WHERE code IS NOT NULL;
CREATE INDEX idx_warehouses_name_lower ON warehouses (LOWER(name));
CREATE INDEX idx_warehouses_name_trgm  ON warehouses USING gin (LOWER(name) gin_trgm_ops);
```

### 1.4 Panache conventions

| ID | Mức | Quy tắc |
| :--- | :--- | :--- |
| **BE-P1** | MUST | Đọc 1 bản ghi theo id: entity danh mục ⇒ `em.find(type(), id)`; entity Panache ⇒ `Xxx.findById(id)` (mẫu `InvDoc.findById(id)`). Không thấy ⇒ `throw new NotFoundException()`. |
| **BE-P2** | MUST | Truy vấn danh sách có lọc/sort/phân trang ⇒ dùng `EntityManager` + JPQL (`MasterResource` đã làm sẵn). **MUST NOT** dùng native query cho CRUD danh mục. |
| **BE-P3** | MUST | Truy vấn đơn giản theo field ⇒ static API Panache: `Xxx.find("field", value).firstResult()`, `Xxx.listAll(Sort.descending("id"))`, `Xxx.count("type", t)`. |
| **BE-P4** | MUST | Ghi dữ liệu: `persist()` (tạo) / sửa field trên managed entity (update) — trong method `@Transactional`. |
| **BE-P5** | MUST | Sau khi ghi, gọi `flushOrConflict(msg)` để chuyển lỗi ràng buộc DB thành **409** thay vì 500 (mẫu `MasterResource`). |
| **BE-P6** | MUST | Xoá nhiều theo id ⇒ `Xxx.delete("id in ?1", ids)`; **MUST** chặn danh sách rỗng và (nên) giới hạn số lượng mỗi lần. |
| **BE-P7** | MUST | Khoá mới do server cấp: trong `create` phải tự null hoá khoá từ client (`d.id = null`, `lines[].id = null`) trước khi persist. |
| **BE-P8** | MUST | Cập nhật master–detail: nếu chọn "thay thế toàn bộ detail" ⇒ `detail.clear()` rồi add lại (mẫu `InvDocResource.update`); nếu chọn "merge" ⇒ MUST xử lý `UNIQUE(doc_id, pos)` (xem guide §7.1 #8, `.ai/modules/inventory-architect.md` §4.3). |
| **BE-P9** | MUST | Sinh số/khoá nghiệp vụ phải **atomic**: dùng bảng counter/sequence trong cùng transaction. **MUST NOT** dùng `count(*) + 1` / `max(...) + 1` (race ⇒ trùng số). |
| **BE-P10** | SHOULD | Truy vấn danh sách lớn: tránh N+1 — với `@OneToMany` cân nhắc `join fetch` hoặc DTO tổng hợp (`SELECT new …`); không serialize chi tiết không cần thiết. |
| **BE-P11** | MUST | Không dùng `EntityManager` cho entity Panache và ngược lại lẫn lộn tuỳ tiện — chọn 1 style cho mỗi Resource và ghi chú trong class. |
| **BE-P12** | MUST NOT | Gọi `persist()`/`flush()` ngoài transaction; **MUST NOT** để `@Transactional` trên method private. |

**Mẫu chuẩn — sinh số phiếu atomic (BE-P9):**
```java
// Đúng: 1 câu native duy nhất, atomic trong transaction (đã có bảng inv_doc_counter)
Object n = em.createNativeQuery(
        "UPDATE inv_doc_counter SET last_no = last_no + 1 WHERE type = :t RETURNING last_no")
    .setParameter("t", type).getSingleResult();
d.no = PREFIX.get(type) + String.format("%04d", ((Number) n).longValue());

// ❌ Sai (code hiện tại — cần sửa theo guide §7.1 #7):
// long n = InvDoc.count("type", d.type) + 1;
// ⇒ race khi 2 người lưu cùng lúc + tái sử dụng số của phiếu đã xoá
```

**Mẫu chuẩn — tạo/cập nhật (BE-P4/P5/P7/P8):**
```java
@Transactional
public Response create(InvDoc d) {
    d.id = null;                                  // BE-P7
    d.lines.forEach(l -> l.id = null);
    d.no = nextNo(d.type);                        // BE-P9
    d.persist();                                  // BE-P4
    flushOrConflict("Số phiếu bị trùng, vui lòng lưu lại");   // BE-P5 ⇒ 409
    return Response.status(201).entity(d).build();
}
```

**Bảng chọn API Panache vs JPQL:**

| Nhu cầu | Dùng |
| :--- | :--- |
| Lấy theo id | `findById` / `em.find` |
| Lấy theo 1 field (unique) | `find("field", v).firstResult()` |
| Liệt kê có sort cố định | `listAll(Sort...)` |
| Đếm theo điều kiện | `count("field", v)` |
| Tìm kiếm/lọc/sort/phân trang động | `EntityManager` + JPQL + named parameter |
| Tổng hợp (`sum`, `group by`) | JPQL `SELECT new com.ketoan.dto.XxxSummary(...)` |
| Cần `UPDATE … RETURNING` | native query + **comment giải thích** (BE-R14) |

---

## 2. FRONTEND RULES

> Chỉ áp dụng cho `src/main/webui`. **MUST NOT** sửa `src/main/webui-v1` (bản thử nghiệm, Quinoa không build).

### 2.1 Plugin conventions

| ID | Mức | Quy tắc |
| :--- | :--- | :--- |
| **FE-PL1** | MUST | Mỗi plugin = 1 thư mục `src/main/webui/src/plugins/<id>/index.jsx` export **default object**; tên thư mục **phải trùng** `id` (do `import.meta.glob` + `SKIPPED_PLUGINS` so khớp theo tên thư mục). |
| **FE-PL2** | MUST | Object plugin có tối thiểu: `id`, `title`, `icon`, `View`. (`registerPlugin` sẽ `throw` nếu thiếu `id`/`View`.) |
| **FE-PL3** | MUST | `title` là **key i18n** (`'inv.title'`), **MUST NOT** là chuỗi hiển thị trực tiếp. |
| **FE-PL4** | MUST | Khai báo `messages: { vi: {…}, en: {…} }` cho **mọi** chuỗi mới; prefix = tên plugin (`inv.*`, `cat.*`). Thiếu key ⇒ UI hiển thị chính tên key (bug đã gặp: `inv.saveFailed`, `inv.deleteFailed`). |
| **FE-PL5** | SHOULD | Đặt `order` (số nhỏ = lên trên; mặc định 100). `adminOnly: true` **chỉ** dùng cho plugin quản trị. |
| **FE-PL6** | MUST | `initialState` chỉ chứa state **nhỏ, serializable, cần giữ khi Back/F5**: `mode`, `filterType`, `q`, `filters`, `sort`, `page`, `pageSize`, `selected`, `id`… **MUST NOT** nhét object lớn (phiếu + mảng lines) vào state/URL — xem `.ai/modules/inventory-architect.md` §7.4. |
| **FE-PL7** | MUST | Điều hướng trong plugin qua `setState(patch)` / `setState(fn)`. `{replace:true}` **chỉ** cho thay đổi tạm (gõ chữ, tick, đổi filter, đổi trang); điều hướng thật (đổi plugin, mở form, mở kết quả search) **MUST NOT** dùng `replace`. |
| **FE-PL8** | MUST | `View` mở đầu bằng `if (!props.can('<id>', 'read')) return <Denied />;`. |
| **FE-PL9** | MUST | Nếu `View` có early-return mà vẫn cần hook/dữ liệu ⇒ đặt toàn bộ hook trong component con rồi mount có `key` (mẫu `Body` trong `catalog`/`inventory`). |
| **FE-PL10** | MUST | Xử lý đủ 3 trạng thái: **loading** (`<Loading/>`), **error** (banner `role="alert"` + nút *Thử lại*), **empty** (phân biệt "chưa có dữ liệu" vs "không có kết quả"). |
| **FE-PL11** | MUST | Mọi thao tác nguy hiểm qua `useConfirm()`; mọi thao tác async phải có cờ `busy`/`saving` chống double-click. **MUST NOT** dùng `window.confirm`/`alert()` cho luồng mới. |
| **FE-PL12** | MUST | Nút ghi/sửa/xoá trên Ribbon/Menu/Toolbar **MUST** có `disabled: !can('<id>', '<action>')`. |
| **FE-PL13** | SHOULD | `search(q)` (Global Search) phải **rẻ và không side-effect**: tìm trong dữ liệu đã có (`st.docs`) hoặc 1 request nhẹ; trả `[{ id, title, subtitle, state }]` (state nhỏ, không trả object nặng). |
| **FE-PL14** | MUST NOT | Import plugin này từ plugin khác ⇒ giao tiếp qua `bus` (`setup({bus}) { bus.on(...) }` / `bus.emit(...)`). |
| **FE-PL15** | MUST NOT | Tạo plugin mới mà không cập nhật `core/permissions.js` (`PLUGIN_IDS` + `DEFAULT`) và `NAMES` trong `plugins/admin/index.jsx` (thiếu ⇒ trang Admin trắng màn hình — `.ai/modules/admin-agent.md` §9 A1). |
| **FE-PL16** | SHOULD | Giữ plugin tự chứa (component con khai trong cùng file). Khi ≥2 plugin dùng chung ⇒ trích ra `core/` (`core/DataTable.jsx`, `core/csv.js`) thay vì copy-paste (nợ hiện có giữa `catalog` ↔ `inventory`). |
| **FE-PL17** | MUST | Emoji icon + `aria-label`/`title` cho **mọi** nút chỉ có icon. |

**Khung plugin tối thiểu (copy để tạo mới):**
```jsx
import { useI18n } from '../../core/i18n.jsx';
import Denied from '../../core/Denied.jsx';

const messages = {
  vi: { 'wh.title': 'Kho hàng', 'wh.empty': 'Chưa có dữ liệu.' },
  en: { 'wh.title': 'Warehouses', 'wh.empty': 'No data yet.' },
};

function Body({ state, setState, can }) {
  const { t } = useI18n();
  // … hooks + dữ liệu ở đây (FE-PL9)
  return <div className="pad"><h2>{t('wh.title')}</h2></div>;
}

function View(props) {
  if (!props.can('warehouse', 'read')) return <Denied />;   // FE-PL8
  return <Body {...props} />;
}

export default {                                              // FE-PL2
  id: 'warehouse', title: 'wh.title', icon: '🏬', order: 7, messages,
  initialState: { page: 1 }, View,
  ribbon: ({ setState, can }) => ({ tabs: [], groups: {} }),
};
```

### 2.2 Store conventions

| ID | Mức | Quy tắc |
| :--- | :--- | :--- |
| **FE-ST1** | MUST | Dữ liệu danh mục **MUST** đi qua store trong `core/masterdata.js`. **MUST NOT** gọi `fetch`/`http` trực tiếp trong component. |
| **FE-ST2** | MUST | Store (mock & real) giữ **cùng interface**: `use()`, `useQuery(query,{enabled})`, `search(q,{limit})`, `add/update/remove`, `load`, `reset`, getter `list` (+ `resolve` khi cần join giả lập). Thêm method mới ⇒ thêm cho **cả hai**. |
| **FE-ST3** | MUST | Hợp đồng query của store: `{ q, page, pageSize, sort:{key,dir}, filters:{…} }` → server trả `{items,total}`. Thêm tham số mới ⇒ cập nhật **3 nơi**: `createstore.buildQS`, `mockstore.queryLocal`, và `applyFilters`/`list` phía Resource. |
| **FE-ST4** | MUST | Không sửa trực tiếp object trong store (`store.list.push(...)`, gán `row.x = y`) — chỉ qua `add/update/remove` và **`await`**. |
| **FE-ST5** | MUST | Cập nhật cache **không lạc quan**: chỉ set state sau khi server trả thành công; sau thao tác ghi phải báo cho `useQuery` biết (mẫu `invalidate()`/`version` trong `createstore.js`). |
| **FE-ST6** | MUST | Mọi store **MUST** có `reset()` (xoá cache khi logout/đổi tài khoản). Store cấp module trong plugin (mẫu `st` của kho) **MUST** expose reset và được gọi trong `clearSession()`/`logout` (`core/auth.jsx`). |
| **FE-ST7** | MUST | Query hook mới ⇒ dùng `useAsyncQuery` (`core/useasyncquery.js`): đã có `AbortController`, `enabled` (hoãn khi debounce), `refresh`, phân biệt `loading`/`fetching`. **MUST NOT** tự viết `useEffect + fetch`. |
| **FE-ST8** | MUST | Một nguồn API cho mỗi domain: `src/main/webui/src/api/<domain>Api.js`. **MUST NOT** nhân bản file (lỗi hiện tại: `core/inventoryApi.js` **và** `src/api/inventoryApi.js`). |
| **FE-ST9** | SHOULD | Store master–detail (không khớp `createStore`) ⇒ dùng module-level state + `useSyncExternalStore`, và thêm `gen` guard chống race như `createstore.js`. |
| **FE-ST10** | MUST NOT | Lưu **dữ liệu dẫn xuất** (`items`, `totalPages`, `grandTotal`) vào store/URL — luôn tính trong render. |
| **FE-ST11** | MUST | Store giả lập phải **mô phỏng đúng server** (bỏ dấu khi tìm `q`, cùng tên filter, cùng khoá sort, cùng kiểu trả `{items,total}`) để chế độ mock phản ánh trung thực. |
| **FE-ST12** | MUST | `mockConfig.failRate` **MUST** giữ `0` trong code đã commit (chỉ đổi tay khi test nhánh lỗi). |
| **FE-ST13** | SHOULD | Danh sách lớn ⇒ `useQuery` + phân trang server-side; danh sách nhỏ (dropdown) mới dùng `use()`. |

**Mẫu chuẩn — dùng store trong plugin:**
```jsx
// ✅ Đúng
const { items, total, loading, fetching, error, reload } =
  suppliersStore.useQuery({ q, page, pageSize, sort, filters }, { enabled: !typing });

// ❌ Sai
useEffect(() => { fetch('/api/suppliers?page=' + page).then(r => r.json()).then(setRows); }, [page]);  // FE-ST1/FE-ST7
suppliersStore.list.push(newRow);        // sửa cache trực tiếp (FE-ST4)
suppliersStore.add(row);                 // không await + không xử lý lỗi (FE-ST4/FE-ST5)
```

### 2.3 API conventions

| ID | Mức | Quy tắc |
| :--- | :--- | :--- |
| **FE-AP1** | MUST | Mọi HTTP đi qua **đúng 2 client hiện có**: `core/http.js` (`http.get/post/put/patch/delete`) cho nghiệp vụ/dữ liệu; `core/api.js` (`apiFetch`) cho auth/phiên & Global Search. **MUST NOT** tạo client thứ ba, **MUST NOT** gọi `fetch` trong component. |
| **FE-AP2** | MUST | Luôn gửi cookie: giữ `credentials: 'include'` trong cả 2 client. **MUST NOT** thêm header `Authorization`, **MUST NOT** lưu/đọc token từ `localStorage` (auth bằng HttpOnly cookie). |
| **FE-AP3** | MUST | Base URL lấy từ env: `VITE_API_URL` (mặc định `/api`) cho `http.js`, `VITE_API_BASE` (mặc định `''` = same-origin) cho `api.js`. **MUST NOT** hardcode `http://localhost:8080`. |
| **FE-AP4** | MUST | Một hàm cho một endpoint, đặt trong module API của domain (`src/api/<domain>Api.js`); **MUST NOT** rải cùng endpoint ở nhiều file. |
| **FE-AP5** | MUST | Đọc lỗi theo thứ tự `data?.message ?? data?.error ?? res.statusText`. Endpoint BE mới **MUST** trả `{"message": "…"}` (BE-R11). |
| **FE-AP6** | MUST | Mutation trả `Promise`: nơi gọi **MUST** `await` + `try/catch`, và hiển thị lỗi cho người dùng (banner/`formError`, không `alert` cho luồng mới). |
| **FE-AP7** | MUST | `DELETE` ở BE trả **204**; FE xử lý `null` (đã có trong `http.js`). Không kỳ vọng body. |
| **FE-AP8** | MUST | Giữ guard chống "server trả HTML thay JSON" của `apiFetch` (phát hiện khi Vite chưa proxy `/api`) — không bỏ khi refactor. |
| **FE-AP9** | MUST | Payload **MUST** là JSON thuần, **MUST** loại bỏ field chỉ dùng cho UI trước khi gửi (mẫu `saveDoc()` bỏ `hint`/`price` của Autocomplete, chuẩn hoá `{id,name}`). |
| **FE-AP10** | MUST | Tên field trong payload **MUST** trùng tên field entity/DTO của server (`partner`, `bank`, `date`, `lines[].product`, `qty`, `price`) — **MUST NOT** tự đổi tên ở FE. |
| **FE-AP11** | SHOULD | Giữ tương thích với `{items: [...], total: N}` khi server phân trang; dùng `normalize()` của `createstore.js` thay vì tự viết parser. |
| **FE-AP12** | MUST | Xử lý 401: `apiFetch` đã gọi `onUnauthorized` (tự logout). Nếu thêm client/store mới **MUST** đăng ký `configureHttp({ onUnauthorized })` để không "chết im lặng" (nay: `AuthProvider` đã đăng ký cho `http.js` — xem `core/auth.jsx`). |
| **FE-AP13** | SHOULD | CSV/import: parse ở FE rồi gọi REST (chưa có multipart). **MUST** validate & báo lỗi theo dòng trước khi gửi (mẫu `importRows`/`importDocs`). |

**Mẫu chuẩn — thêm 1 endpoint mới cho domain kho:**
```js
// src/main/webui/src/api/inventoryApi.js  (MỘT nơi duy nhất — FE-ST8/FE-AP4)
export const inventoryApi = {
  list: (params = {}) => http.get('/inventory/docs' + toQS(params)),   // ?q&page&pageSize&sort&dir
  create: (doc) => http.post('/inventory/docs', doc),
  // …
};
// ❌ Sai: fetch trong component; thêm header Authorization; tạo core/inventoryApi2.js
```

### 2.4 Permission conventions

| ID | Mức | Quy tắc |
| :--- | :--- | :--- |
| **FE-PE1** | MUST | Khoá quyền = **`plugin.id`**; action chỉ 4 giá trị `read`/`create`/`update`/`delete` (muốn thêm ⇒ sửa **cả** `ACTIONS` và `DEFAULT`). |
| **FE-PE2** | MUST | Ma trận quyền **chỉ là UI**: mọi bảo vệ thật **MUST** ở server (`@Authenticated`/`@RolesAllowed`) — xem CS-S1. **MUST NOT** coi `can()` là cơ chế bảo mật. |
| **FE-PE3** | MUST | Vai trò `admin` **luôn full quyền**; **MUST NOT** lưu/khai báo quyền cho admin trong ma trận (`Shell.can` đã short-circuit). |
| **FE-PE4** | MUST | Thêm plugin có CRUD ⇒ cập nhật **đủ 3 nơi**: `PLUGIN_IDS` + `DEFAULT` (`core/permissions.js`) và `NAMES` (`plugins/admin/index.jsx`). |
| **FE-PE5** | MUST NOT | Đổi tên action (`delete` → `remove`) mà không sửa **đồng thời**: `ACTIONS`, `DEFAULT`, label i18n `admin.*`, và **mọi** call-site `can(id, 'delete')`. |
| **FE-PE6** | MUST | `View` chặn `read` bằng `<Denied/>` (FE-PL8); nút ghi/xoá **MUST** `disabled: !can(id, action)`. |
| **FE-PE7** | MUST | Quyền liên plugin dùng **id của plugin sở hữu** (vd kho cần tạo NCC ⇒ `can('catalog','create')`). **MUST NOT** bịa khoá mới (`can('inventory','create-partner')`). |
| **FE-PE8** | MUST | Không so sánh role trực tiếp trong plugin (`role === 'admin'`) để quyết định quyền — luôn dùng `can(...)` (chỉ `Shell` được đọc `role` cho việc lọc `adminOnly`). |
| **FE-PE9** | SHOULD | Không cache kết quả `can()` ở cấp module; luôn gọi tại thời điểm render để thay đổi quyền có hiệu lực ngay. |
| **FE-PE10** | MUST | Thêm đường ghi mới ⇒ ghi rõ trong tài liệu module + `CHANGELOG.md` xem **server đã enforce chưa**; nếu chưa, ghi cảnh báo (mẫu: `.ai/modules/inventory-agent.md` §7). |

---

## 3. CODING STANDARDS — QUY CHUẨN CHUNG

### 3.1 Naming rules

| ID | Mức | Quy tắc | Ví dụ thật |
| :--- | :--- | :--- | :--- |
| **CS-N1** | MUST | Package Java = `com.ketoan.<layer>`, **1 cấp**, không chia theo feature | `com.ketoan.resource`, `entity`, `service`, `dto`, `config` |
| **CS-N2** | MUST | Hậu tố lớp theo tầng: REST `…Resource`, nghiệp vụ `…Service`, DTO `…Request`/`…Response`, entity = danh từ số ít | `SupplierResource`, `AuthService`, `AuthRequest` |
| **CS-N3** | MUST | Method REST theo động từ chuẩn: `list`, `get`, `create`, `update`, `delete` (+ `bulkDelete` cho hành động phụ) | `MasterResource` |
| **CS-N4** | MUST | Hằng số `static final` + `UPPER_SNAKE`; hằng số module FE cũng `UPPER_SNAKE` | `TOKEN_TTL_SECONDS`, `SKIPPED_PLUGINS`, `EMPTY_VIEW`, `IMPORT_SPEC` |
| **CS-N5** | MUST | Biến/hàm `camelCase`; viết tắt chỉ khi **có nghĩa và nhất quán trong file** | `em`, `e` (entity), `w` (Where), `q`, `pg`, `size`, `t` (dịch) |
| **CS-N6** | MUST | DB: bảng/cột `snake_case`; index theo mẫu `uq_*_lower` / `idx_*` / `idx_*_trgm`; migration `V0000X__*.sql` | `inv_doc_line`, `partner_name`, `idx_inv_doc_date` |
| **CS-N7** | MUST | REST: `/api/<danh từ số nhiều kebab-case>`; tham số list chuẩn `q/page/pageSize/sort/dir` + tên filter trùng FE | `/api/material-types`, `/api/inventory/docs` |
| **CS-N8** | MUST | Mã nghiệp vụ theo tiền tố quy ước: NCC/KH/VT (danh mục), PN/PX/PT + `%04d` (phiếu); loại phiếu tiếng Anh `import/export/return` | `PN0001` |
| **CS-N9** | MUST | FE: thư mục plugin = `plugin.id` (lowercase kebab); file vào = `index.jsx` export default | `plugins/inventory/index.jsx` |
| **CS-N10** | MUST | FE: component `PascalCase`; hook `useXxx`; store `xxxStore`; API client `xxxApi`; handler `onXxx` (prop) / `doXxx` (nội bộ) | `FormView`, `useDocs`, `suppliersStore`, `inventoryApi`, `onBulkDelete`, `doSave` |
| **CS-N11** | MUST | i18n: `<prefix>.<ý>` (prefix = plugin id), **luôn đủ `vi` + `en`**, placeholder `{name}` thay bằng `.replace()` | `'inv.range': 'Hiển thị {from}–{to} / {total}'` |
| **CS-N12** | MUST | CSS class `kebab-case` ngắn; dùng biến `--brand/--panel/--line/--muted/--accent`. Style inline **chỉ** cho giá trị động | `invtable zebra`, `cattools`, `formError` |
| **CS-N13** | MUST | Comment **tiếng Việt**, giải thích **vì sao** (nhất là chỗ đánh đổi/giới hạn); không comment lại điều hiển nhiên | `// Vi phạm unique / khóa ngoại chỉ nổ khi flush => …` |
| **CS-N14** | MUST | **Không dấu tiếng Việt** trong: identifier, tên bảng/cột, path, i18n key, CSS class. Tiếng Việt **chỉ** ở chuỗi hiển thị, comment, message lỗi | ✅ `'inv.empty': 'Chưa có phiếu nào.'` · ❌ `const soLuong = 1` |
| **CS-N15** | MUST | File chứa JSX ⇒ `.jsx`; file thuần logic ⇒ `.js`. Import nội bộ ghi **tường minh đuôi** | `import { http } from './http.js'` |
| **CS-N16** | MUST | Ngày/giờ trên API dùng ISO (`yyyy-MM-dd`); tiền **chỉ** format khi render bằng `vnd()`; **MUST NOT** format rồi lưu vào state/DB | `date: '2026-10-16'` |

### 3.2 Security rules

| ID | Mức | Quy tắc |
| :--- | :--- | :--- |
| **CS-S1** | MUST | **Mọi** Resource nghiệp vụ phải có `@Authenticated`. ⚠️ Nợ hiện tại: `InvDocResource` **thiếu** ⇒ khi chạm module Kho **MUST** bổ sung (guide §7.1 #1), và bổ sung **cùng lúc** với sửa FE (`.ai/modules/inventory-architect.md` §9.4). |
| **CS-S2** | MUST | Thao tác phá huỷ/nhạy cảm (xoá, xoá hàng loạt, ghi danh mục nếu nghiệp vụ chỉ cho admin) **MUST** `@RolesAllowed("admin")` — role **chữ thường** (`admin`/`user`); **MUST NOT** dùng `ROLE_ADMIN`/`ADMIN`. |
| **CS-S3** | MUST | **MUST NOT** trả entity chứa bí mật qua API (`User.password`, token). Auth **MUST** dùng DTO tối thiểu (BE-R10). |
| **CS-S4** | MUST | Token **chỉ** nằm trong HttpOnly cookie: **MUST NOT** đọc/ghi token bằng JS, **MUST NOT** thêm header `Authorization` cho luồng mới. |
| **CS-S5** | MUST | Khi lên HTTPS: đặt `secure(true)` cho cookie (`loginv1` **và** `logout`), cân nhắc `SameSite=Strict`, đưa vào profile `%prod`. |
| **CS-S6** | MUST | Validate **ở server** (BE-R9/BE-R11); validate FE chỉ là UX. Ràng buộc nghiệp vụ **MUST** có thêm chốt ở DB (BE-F9). |
| **CS-S7** | MUST | Chống injection: chỉ named parameter cho giá trị, chỉ whitelist cho sort/tên field (BE-R12). |
| **CS-S8** | MUST | Lỗi trả người dùng **MUST NOT** lộ chi tiết hệ thống (stacktrace, tên bảng/cột, câu SQL). Dùng `{"message": …}` tiếng Việt. |
| **CS-S9** | MUST | **MUST NOT** tin "snapshot" từ client (`partner.name`, `product.name`): server phải tra tên theo `id` khi lưu chứng từ. |
| **CS-S10** | MUST | **MUST NOT** commit `.env`, `*.pem`, `secretKey.jwk`, `cookies.txt`; kiểm tra `.gitignore` trước khi thêm file cấu hình/khai báo mới. Không để credential mặc định (`laravel`/`secret`, mật khẩu `123`) cho production. |
| **CS-S11** | MUST | Dữ liệu seed/test (`V00004__master_date_dummy.sql`, user seed) **MUST NOT** được coi là dữ liệu vận hành; môi trường thật cần migration riêng để dọn/tắt. |
| **CS-S12** | MUST | `localStorage` chỉ chứa: `user` (thông tin hiển thị), `perms_user`, `lang`, `navOpen`. **MUST NOT** chứa token, mật khẩu, hay dữ liệu nghiệp vụ nhạy cảm. |
| **CS-S13** | MUST | Chứng từ kế toán: **MUST NOT** xoá cứng nếu đã ghi sổ (dùng `status='cancelled'`/`deleted_at`); thêm luồng ghi mới **MUST** ghi `created_by`/`updated_by` từ JWT; số phiếu **MUST NOT** tái sử dụng (BE-P9). |
| **CS-S14** | MUST | Endpoint **MUST** có biên: phân trang danh sách lớn, chặn số id mỗi lần bulk-delete, giới hạn số dòng/kích thước file import. **MUST NOT** thêm endpoint trả toàn bộ bảng không giới hạn. |
| **CS-S15** | MUST | **MUST NOT** hiển thị lỗi kỹ thuật cho người dùng (`alert('…: Internal Server Error')`); log chi tiết ra console/logger, UI hiện message thân thiện. |
| **CS-S16** | SHOULD | Nếu thêm export CSV/Excel ⇒ **MUST** escape formula injection (ô bắt đầu bằng `=`, `+`, `-`, `@`). |
| **CS-S17** | MUST | Đổi claim JWT (`upn`, `groups`, `name`) ⇒ cập nhật **đồng thời** `AuthService` + `AuthResource.me` + `application.properties` (issuer/keys) — xem `.ai/modules/auth-agent.md` §9 A1–A3. |
| **CS-S18** | MUST | Không coi `SecurityFilter` là lớp bảo vệ (nó chỉ kiểm tra cookie tồn tại) và **MUST NOT** gỡ `@Authenticated`/`@RolesAllowed` vì "đã có filter". |

### 3.3 Refactoring rules

| ID | Mức | Quy tắc |
| :--- | :--- | :--- |
| **CS-R1** | MUST | **Thay đổi tối thiểu**: chỉ sửa phần cần sửa. **MUST NOT** format lại/đổi style ở file không liên quan. |
| **CS-R2** | MUST NOT | Trộn refactor với tính năng mới trong cùng một thay đổi — tách thành 2 bước. |
| **CS-R3** | MUST | Trước khi refactor **MUST** xác định mọi call-site. Các "hợp đồng" dễ vỡ nhất: `can(id, action)`; interface store (`use/useQuery/search/add/update/remove/reset`); shape API (`{items,total}`, `{"message"}`, mảng `InvDoc[]`); tên query param (`q/page/pageSize/sort/dir` + filter); tên key i18n. |
| **CS-R4** | MUST | Trích code dùng chung (nợ `catalog` ↔ `inventory`) ⇒ sửa **cả hai** plugin trong cùng thay đổi, hoặc để lại `TODO` ghi rõ file đối ứng. |
| **CS-R5** | MUST | 8 file backup (`*copy*.jsx`, `router copy 2.js`, `router-3.js`) ⇒ **xoá**; **MUST NOT** sửa/hồi sinh. |
| **CS-R6** | MUST | **MUST NOT** đổi tên i18n key / action quyền / đường dẫn REST mà không cập nhật **mọi** nơi dùng (grep trước, sửa hết, cập nhật tài liệu). |
| **CS-R7** | MUST | Refactor DB chỉ bằng migration mới, theo 3 bước ở BE-F11. **MUST NOT** sửa migration cũ. |
| **CS-R8** | SHOULD | Chỉ trích ra `core/` khi ≥2 nơi dùng thật; tránh abstraction sớm (đừng tạo `core/utils.js` chung chung). |
| **CS-R9** | MUST | Sau refactor **MUST** grep và xoá code chết do mình tạo ra (import thừa, hàm không còn ai gọi). |
| **CS-R10** | MUST | Refactor đổi cấu trúc ⇒ cập nhật `COMPONENT_MAPPING.md` + `.ai/modules/*` liên quan + `CHANGELOG.md`. |
| **CS-R11** | MUST | Giữ parity mock ↔ real sau refactor (FE-ST11); **MUST NOT** hardcode URL/host khi đổi cách gọi API (FE-AP3). |
| **CS-R12** | SHOULD | Chia refactor thành bước nhỏ kiểm chứng được; sau mỗi bước chạy `./mvnw compile quarkus:dev` và/hoặc dev server FE. |
| **CS-R13** | MUST | Khi refactor theo khuyến nghị của `PROJECT_GUIDE.md` §7 ⇒ trích dẫn số hiệu khuyến nghị (vd `§7.2 #13`) trong commit/CHANGELOG để truy vết. |

### 3.4 Feature implementation rules

**Quy trình bắt buộc (theo thứ tự):**

| ID | Mức | Quy tắc |
| :--- | :--- | :--- |
| **CS-F1** | MUST | Bước 1: đọc đúng nhóm file theo bảng §0.3 **và** tài liệu module tương ứng trong `.ai/modules/` trước khi viết code. |
| **CS-F2** | MUST | Bước 2: nêu kế hoạch + danh sách file sẽ chạm + contract API/migration dự kiến; chỉ code sau khi thống nhất (theo `.clinerules` 1–2). |
| **CS-F3** | MUST | Bước 3: theo **kiến trúc sẵn có** — danh mục ⇒ thêm `MasterResource` con; nghiệp vụ ⇒ Resource (+ Service nếu phức tạp); FE ⇒ plugin/`core`. **MUST NOT** phát minh pattern mới. |
| **CS-F4** | MUST | Bước 4: **tái sử dụng** trước khi viết mới: hooks của `MasterResource`, `flushOrConflict`, `createStore`/`makeStore`, `Autocomplete`, `useConfirm`, `Loading`/`Denied`/`Spinner`, `vnd`, `useAsyncQuery`, `buildTabs`. |
| **CS-F5** | MUST | Bước 5: **grep trước khi tạo** — nếu API/logic đã tồn tại (`PROJECT_GUIDE.md` §5.2 + phụ lục) thì **MUST NOT** tạo bản thứ hai. |
| **CS-F6** | MUST | Tính năng mới **MUST** đi trọn "vertical slice": migration → entity → resource → (service) → API client/store → plugin UI → i18n → permission → tài liệu. Không để nửa vời (vd thêm cột DB nhưng không có UI). |
| **CS-F7** | MUST | Danh sách có khả năng tăng **MUST** có phân trang/lọc/sort **server-side** ngay từ đầu (BE-R7, FE-ST13, CS-S14). |
| **CS-F8** | MUST | Trước khi kết thúc: chạy checklist bảo mật CS-S1…CS-S18 + `PROJECT_GUIDE.md` §6.3. |
| **CS-F9** | MUST | Chuỗi mới **MUST** có đủ `vi` + `en`; **MUST NOT** viết tiếng Việt trực tiếp trong JSX/`title`. |
| **CS-F10** | MUST | Thêm đường ghi (POST/PUT/DELETE) ⇒ **MUST** có: validate server (400), xử lý trùng/vi phạm (409), xác nhận ở FE, cờ `busy`, và tối thiểu 1 test. |
| **CS-F11** | SHOULD | Viết test theo `PROJECT_GUIDE.md` §7.3 #27: BE `@QuarkusTest` + RestAssured (đăng nhập lấy cookie), FE unit cho logic thuần. `pom.xml` đang `skipTests=true` ⇒ **MUST** nêu rõ cách đã kiểm thử trong báo cáo. |
| **CS-F12** | MUST | Cập nhật tài liệu: `CHANGELOG.md`; `COMPONENT_MAPPING.md` nếu thêm component/API; `.ai/modules/<x>-agent.md` nếu đổi module; `PROJECT_STATUS.md` nếu đổi phạm vi. |
| **CS-F13** | MUST NOT | Chạm file ngoài phạm vi: `webui-v1`, file backup, module không liên quan, `.env`/`*.pem`. |
| **CS-F14** | MUST | Kết thúc **MUST** báo cáo: file đã sửa, lệnh đã chạy, kết quả kiểm thử, việc còn lại (TODO) kèm rule ID nếu tạm vi phạm. |

**Recipe 1 — Thêm một danh mục** (chi tiết: `PROJECT_GUIDE.md` §6.6):
```
1. migration V0000X__<ten>.sql   (bảng + UNIQUE LOWER(code) + idx name + trgm)  BE-F1/F5/F6/F7
2. entity/<Ten>.java             extends MasterEntity                            BE-E1/E2/E5
3. resource/<Ten>Resource.java   extends MasterResource<Ten> + hooks             BE-R2/R4
4. core/masterdata.js            makeStore('<TIỀN TỐ>', '/<plural>', [])         FE-ST1/ST2
5. plugins/catalog/index.jsx     CATS + schemaFor + filtersFor + IMPORT_SPEC     FE-PL16
6. messages vi+en                'cat.<ten>' + nhãn cột/filter                   FE-PL4/CS-N11
7. permissions.js: KHÔNG sửa     (quyền theo plugin 'catalog')                   FE-PE1
```

**Recipe 2 — Thêm plugin nghiệp vụ mới** (chi tiết: `PROJECT_GUIDE.md` §6.7):
```
1. plugins/<id>/index.jsx   export default {id,title,icon,order,messages,View,…}   FE-PL1/PL2
2. messages vi+en           '<pfx>.*'                                              FE-PL4
3. src/api/<domain>Api.js   (nếu cần REST) hoặc thêm store vào masterdata.js       FE-ST8
4. core/permissions.js      PLUGIN_IDS + DEFAULT                                   FE-PE4
5. plugins/admin/index.jsx  NAMES[id] = '<pfx>.title'                              FE-PE4
6. Backend                  Resource (+Service) + Entity + migration                BE-R/E/F
7. docs                     CHANGELOG + COMPONENT_MAPPING + .ai/modules/<id>-agent.md  CS-F12
```

**Recipe 3 — Thêm endpoint ghi cho module Kho** (ví dụ "duyệt phiếu"):
```
1. migration: ALTER TABLE inv_doc ADD COLUMN status …                 BE-F11 (additive)
2. entity InvDoc: thêm field (+ @Version nếu cần chống ghi đè)         BE-E10/E11
3. service/InvDocService: validate + chuyển trạng thái + created_by/updated_by  BE-R3, CS-S13
4. resource: @POST /docs/{id}/approve + @RolesAllowed("admin")         BE-R4/R6, CS-S2
5. FE: inventoryApi.approve(id) (MỘT nơi) → nút Ribbon disabled:!can()  FE-AP4, FE-PL12
6. FE: cập nhật store sau khi thành công + banner lỗi (không alert)    FE-ST5, CS-S15
7. test 401/403/400/409 + cập nhật .ai/modules/inventory-*.md          CS-F10/F11/F12
```

---

## 4. CHECKLISTS — DANH SÁCH KIỂM TRƯỚC KHI HOÀN THÀNH

### 4.1 Backend (Definition of Done)

- [ ] Resource mới/đổi có `@Authenticated`; thao tác nhạy cảm có `@RolesAllowed` (**CS-S1/CS-S2/BE-R4**).
- [ ] Danh mục: kế thừa `MasterResource`, chỉ override hook (**BE-R2**).
- [ ] List trả `{items,total}`, có `q/page/pageSize/sort/dir`, `pageSize` chặn `[1,100]` (**BE-R7**).
- [ ] Sort qua whitelist; filter qua named parameter (**BE-R12**).
- [ ] Ghi dữ liệu: `@Transactional` + `validate` + `flushOrConflict` ⇒ 409 (**BE-R9/BE-P5**).
- [ ] Lỗi người dùng ⇒ 400/404/409 + `{"message": …}`, không 500 (**BE-R11/CS-S8**).
- [ ] Entity: `public` field, không Lombok, `@Table`/`@Column` tường minh, tiền = `BigDecimal` (**BE-E5/E6/E10**).
- [ ] Thay đổi schema ⇒ **migration mới** `V0000X__*.sql`, không sửa file cũ (**BE-F1/F2**).
- [ ] Có `UNIQUE INDEX LOWER(code)` (danh mục) / index trgm cho cột tìm kiếm (**BE-F6/F7**).
- [ ] Sinh số/khoá nghiệp vụ **atomic** (counter/sequence), không `count+1` (**BE-P9**).
- [ ] Không trả entity chứa bí mật (**BE-R10/CS-S3**).

### 4.2 Frontend (Definition of Done)

- [ ] Plugin đúng hợp đồng `{id,title,icon,View,…}`, `title` là key i18n (**FE-PL1/PL2/PL3**).
- [ ] `View` chặn `read` bằng `<Denied/>`; nút ghi `disabled: !can(...)` (**FE-PL8/FE-PL12/FE-PE6**).
- [ ] Hook đặt trong component con có `key` nếu `View` early-return (**FE-PL9**).
- [ ] Đủ 3 trạng thái loading/error/empty (**FE-PL10**).
- [ ] Dữ liệu đi qua store/API module, **không** `fetch`/`apiFetch` trong component (**FE-ST1/FE-AP1**).
- [ ] Store mới/đổi giữ **cùng interface** mock ↔ real; có `reset()` (**FE-ST2/FE-ST6**).
- [ ] Query dùng `useAsyncQuery`; danh sách lớn dùng `useQuery` server-side (**FE-ST7/FE-ST13**).
- [ ] Payload sạch (bỏ field UI), tên field khớp server (**FE-AP9/FE-AP10**).
- [ ] Thao tác ghi: `await` + `try/catch` + cờ `busy`, không `alert()` cho luồng mới (**FE-AP6/FE-PL11**).
- [ ] Mọi chuỗi mới có `vi` + `en` (**FE-PL4/CS-N11/CS-F9**).
- [ ] Không chạm `webui-v1`/file backup (**CS-R5/CS-F13**).

### 4.3 Tài liệu (Definition of Done)

- [ ] `CHANGELOG.md` có mục Added/Fixed/Changed (**CS-F12**).
- [ ] `COMPONENT_MAPPING.md` cập nhật nếu thêm/đổi component hoặc API (**CS-R10**).
- [ ] `.ai/modules/<module>-agent.md` cập nhật nếu đổi module (**CS-F12**); `inventory-architect.md` nếu đổi kiến trúc kho.
- [ ] `PROJECT_STATUS.md` cập nhật nếu đổi phạm vi/tiến độ.
- [ ] Nếu bỏ qua một rule ⇒ ghi lý do + rule ID vào báo cáo/comment (**CS-F14**).

### 4.4 Code review nhanh (theo rule ID)

```
Kiến trúc : BE-R1..R3, BE-E2/E4, FE-PL1/PL2, CS-R1/R2/R3
Bảo mật   : CS-S1..S18   (bắt buộc: S1, S2, S3, S6, S9)
Dữ liệu   : BE-F1/F2/F6/F9, BE-P5/P7/P9, CS-S13
Hợp đồng  : BE-R7/R11  ↔  FE-ST2/ST3, FE-AP5/AP9/AP10
UX/Chất   : FE-PL4/PL10/PL11/PL12, CS-N11/N14/N16
Tài liệu  : CS-F12, CS-R10
```

---

## 5. NỢ ĐÃ BIẾT — **MUST NOT** LẶP LẠI

| Nợ | Hệ quả | Rule bị vi phạm |
| :--- | :--- | :--- |
| ~~`InvDocResource` thiếu `@Authenticated`~~ | ✅ **ĐÃ SỬA (16/10/2026)**: có `@Authenticated` + `@RolesAllowed("admin")` cho `DELETE`/`bulk-delete` | CS-S1/CS-S2 |
| Ghi danh mục không phân quyền (chỉ `@Authenticated`) | user thường xoá/sửa danh mục | CS-S2 |
| `/auth/register` trả entity `User` (kèm hash) | rò rỉ hash mật khẩu | CS-S3/BE-R10 |
| `/auth/login` trả UUID (không phải JWT) | endpoint chết, gây hiểu nhầm | CS-S3 |
| `SecurityFilter` in log mỗi request, chỉ kiểm cookie tồn tại | nhiễu log, cảm giác an toàn giả | CS-S18 |
| Cookie `secure=false` | không an toàn khi chạy HTTPS | CS-S5 |
| Sinh số phiếu bằng `count+1` | trùng số khi đồng thời + tái sử dụng số | BE-P9/CS-S13 |
| `PUT` phiếu xoá & tạo lại toàn bộ dòng | mất dấu vết, id churn | BE-P8/CS-S13 |
| `InvLine.qty/price` là `long` vs DB `numeric` | mất phần thập phân | BE-E10/E11 |
| Thiếu validate server cho phiếu kho | 500 thay vì 400 | CS-S6/BE-R9 |
| ~~Thiếu key i18n `inv.saveFailed`/`inv.deleteFailed`~~ | ✅ **ĐÃ SỬA (16/10/2026)**: thêm `inv.loadFailed`/`inv.saveFailed`/`inv.deleteFailed` (vi+en) | FE-PL4 |
| ~~2 bản `inventoryApi.js` (`core/` + `src/api/`)~~ | ✅ **ĐÃ SỬA (16/10/2026)**: chỉ còn `src/api/inventoryApi.js` | FE-ST8 |
| 8 file backup `*copy*.jsx`, `router-3.js` | sửa nhầm, nhiễu context | CS-R5 |
| `quarkus-qute` (khai 2 lần) + `commons-dbutils` không dùng | nợ dependency | CS-R9 |
| `model/User.java` (class chết) | grep nhiễu | CS-R9 |
| `matchName`, `configureHttp`, đọc token từ `localStorage` | code chết/hiểu nhầm cơ chế auth | FE-AP2/CS-R9 |
| Phân quyền chỉ ở `localStorage` | không phải bảo mật; mất khi xoá cache | FE-PE2/CS-S12 |
| Test cũ gọi `/danhmuc` + `skipTests=true` | CI "xanh giả" | CS-F11 |
| Dockerfile (`target/quarkus-app/`) vs `quarkus.package.type=uber-jar` | build/deploy lệch | CS-F12 |
| ~~`setup(){ load() }` chạy trước đăng nhập~~ | ✅ **ĐÃ SỬA (16/10/2026)**: `Body` tự load sau khi đăng nhập | CS-S4 |
| `cookies.txt` chưa bị `.gitignore` | rác repo | CS-S10 |
| `state.editing` (cả phiếu + lines) nằm trong URL hash | URL phình, chậm khi phiếu nhiều dòng | FE-PL6 |

> Danh sách đầy đủ 38 mục kèm bằng chứng file:line: `PROJECT_GUIDE.md` §7.1–§7.3.

---

## 6. TRA CỨU NHANH — NHÓM RULE ↔ FILE CẦN ĐỌC

| Nhóm rule | MUST đọc |
| :--- | :--- |
| BE-R1…R14 (Resource) | `resource/MasterResource.java`, một Resource con (`SupplierResource`, `InvDocResource`), `config/RestApplication.java` |
| BE-E1…E13 (Entity) | `entity/MasterEntity.java`, `entity/InvLine.java`, `entity/InvDoc.java`, `entity/User.java` |
| BE-F1…F13 (Flyway) | `db/migration/V00003__add_master_data.sql`, `V00005__document.sql`, `application.properties` |
| BE-P1…P12 (Panache) | `resource/MasterResource.java`, `resource/InvDocResource.java`, `entity/User.java` |
| FE-PL1…PL17 (Plugin) | `core/plugins.js`, `plugins/index.js`, `core/Shell.jsx`, `plugins/catalog/index.jsx` |
| FE-ST1…ST13 (Store) | `core/masterdata.js`, `core/createstore.js`, `core/mockstore.js`, `core/useasyncquery.js` |
| FE-AP1…AP13 (API) | `core/http.js`, `core/api.js`, `src/api/inventoryApi.js` |
| FE-PE1…PE10 (Quyền) | `core/permissions.js`, `core/Shell.jsx`, `plugins/admin/index.jsx` |
| CS-N1…N16 (Naming) | `PROJECT_GUIDE.md` §5, `styles.css`, `core/i18n.jsx` |
| CS-S1…S18 (Security) | `PROJECT_GUIDE.md` §2.5 + §6.3, `application.properties`, `.gitignore` |
| CS-R1…R13 (Refactor) | `PROJECT_GUIDE.md` §7, `COMPONENT_MAPPING.md` §7 |
| CS-F1…F14 (Tính năng) | `PROJECT_GUIDE.md` §6.6/§6.7, `.ai/modules/<module>-agent.md` |

---

**Liên hệ tài liệu:** `.clinerules` (15 nguyên tắc chung) → **`RULES.md` (file này — chi tiết theo repo)** → `PROJECT_GUIDE.md` (kiến trúc & hiện trạng) → `.ai/modules/*` (chi tiết từng module) → `.ai/prompts/*` (khuôn mẫu công việc).

**Khi `RULES.md` mâu thuẫn với code hiện tại:** code là nguồn sự thật về **hiện trạng**; `RULES.md` là nguồn sự thật về **chuẩn cần đạt**. Gặp mâu thuẫn ⇒ (1) code mới làm theo `RULES.md`; (2) ghi nhận nợ vào `PROJECT_GUIDE.md` §7; (3) cập nhật `RULES.md` nếu quyết định đổi chuẩn.












