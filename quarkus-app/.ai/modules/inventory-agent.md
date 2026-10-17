# inventory-agent.md — Module KHO (Nhập – Xuất – Trả)

> **Plugin id (phân quyền):** `inventory` · **Icon:** 📦 · **order:** 5 · **Route:** hash `#{"pluginId":"inventory",…}`
> **Backend route gốc:** `/api/inventory/docs/**` · **Bảng DB:** `inv_doc`, `inv_doc_line`, `inv_doc_counter`
> **Trạng thái:** 🟢 hoạt động (~80%) · **Cập nhật:** 16/10/2026 · **Phiên bản:** `1.0.0-SNAPSHOT`
> **Đọc trước:** [`PROJECT_GUIDE.md`](../../PROJECT_GUIDE.md) §2.6 (luồng InvDoc), §3.4 (store), §6.7 (thêm plugin), §7.1 **#1, #7, #8, #9, #10, #11** (P0 — module này chiếm nhiều cảnh báo nhất)
> **Tài liệu liên quan:** [`COMPONENT_MAPPING.md`](../../COMPONENT_MAPPING.md) §2.2, §3.4, §5.2, §6
>
> ✅ **Cập nhật 16/10/2026:** `GET /inventory/docs` nay **tìm kiếm / lọc / sắp xếp / phân trang ở SERVER** (`q`, `type`, `dateFrom`, `dateTo`, `page`, `pageSize`, `sort`, `dir` → `{ items, total }`); endpoint đã có `@Authenticated` (+ `@RolesAllowed("admin")` cho xoá); FE bỏ `applyView`/`SORT_GET` và bỏ `setup(){ load(); }`; `inventoryApi.js` chỉ còn **một** bản ở `src/api/`. Các mục §1, §3, §4, §5, §7, §9 dưới đây đã cập nhật theo.

---

## 1. PURPOSE — Mục đích

Quản lý **phiếu kho** theo mô hình **Master–Detail**:

| Loại phiếu | `type` | Tiền tố số phiếu | Đối tác |
| :--- | :--- | :--- | :--- |
| Nhập kho | `import` | `PN` | Nhà cung cấp (`suppliers`) |
| Xuất kho | `export` | `PX` | Khách hàng (`customers`) |
| Trả hàng | `return` | `PT` | Khách hàng (`customers`) |

**Năng lực đang có:**
1. Danh sách phiếu: tìm theo số phiếu/đối tác/ghi chú, lọc theo **loại phiếu** (sidebar) và **khoảng ngày**, sắp xếp theo cột, **phân trang — tất cả xử lý ở SERVER** (`GET /inventory/docs?q&type&dateFrom&dateTo&page&pageSize&sort&dir` → `{items,total}`); FE debounce 300ms khi gõ và không tải toàn bộ danh sách.
2. Lập/sửa phiếu: form master (loại phiếu, đối tác, ngân hàng, ngày, ghi chú — có thể thu gọn) + bảng dòng hàng (sản phẩm, số lượng, đơn giá, thành tiền, tổng cộng).
3. **Kéo thả** đổi thứ tự dòng (hoặc nút ▲/▼) — thứ tự được lưu xuống DB qua `@OrderColumn(name="pos")`.
4. **Autocomplete** đối tác/ngân hàng/vật tư, kèm khả năng **tạo mới ngay trong danh mục** nếu có quyền `catalog.create`.
5. **Xoá 1 phiếu** và **xoá hàng loạt** (endpoint `bulk-delete` thật ở server).
6. **Import CSV** nhiều phiếu cùng lúc (gom dòng theo cột `ref`), tự tạo danh mục còn thiếu, có file mẫu.
7. **Global Search**: tìm theo `no + partner.name` (hàm `search` của plugin).

---

## 2. BACKEND FILES

| File | Vai trò | Chi tiết cần biết |
| :--- | :--- | :--- |
| `src/main/java/com/ketoan/resource/InvDocResource.java` | **Toàn bộ REST của module** (`@Path("/inventory/docs")`) | `PREFIX = {import:"PN", export:"PX", return:"PT"}`; `GET list(q,type,dateFrom,dateTo,page,pageSize,sort,dir)` → `{items,total}` (whitelist sort `no/type/partner/date`); `POST create(InvDoc)`; `PUT update(id, InvDoc)`; `DELETE delete(id)`; `POST bulk-delete(List<Long>)`. ✅ Có `@Authenticated`; xoá cần `@RolesAllowed("admin")` |
| `src/main/java/com/ketoan/entity/InvDoc.java` | Entity `inv_doc` (`extends PanacheEntityBase`) | `id(Long, IDENTITY)`, `no`, `type`, `date` (`@Column("doc_date")`), `partner`/`bank` (`@Embedded @AttributeOverrides Ref`), `note`, `lines` (`@OneToMany cascade ALL, orphanRemoval, @JoinColumn("doc_id"), @OrderColumn("pos")`); lớp `Ref` (`@Embeddable`, **package-private**) khai báo cùng file |
| `src/main/java/com/ketoan/entity/InvLine.java` | Entity `inv_doc_line` | `id(Long, IDENTITY)`, `product` (`@Embedded Ref` → `product_id`/`product_name`), `qty(long)`, `price(long)`, `lineTotal` (`@Column("line_total", insertable=false, updatable=false)` — cột generated) |
| `src/main/resources/db/migration/V00005__document.sql` | **Schema module** | `inv_doc_counter(type PK, last_no)`; `inv_doc` (`no UNIQUE`, `type CHECK`, `partner_id varchar(36) NOT NULL` (không FK — trỏ 2 bảng), `bank_id varchar(36) REFERENCES banks ON DELETE SET NULL`, `doc_date NOT NULL DEFAULT CURRENT_DATE`, `note`, audit `created_*`/`updated_*`); `inv_doc_line` (`doc_id bigint FK ON DELETE CASCADE`, `pos int`, `product_id varchar(36) NOT NULL REFERENCES materials`, `product_name`, `qty numeric(18,3) CHECK >0`, `price numeric(18,2) CHECK >=0`, `line_total numeric(20,2) GENERATED ALWAYS AS (qty*price) STORED`, `UNIQUE(doc_id,pos)`); index `idx_inv_doc_type_date`, `idx_inv_doc_date`, `idx_inv_doc_partner`, `idx_inv_doc_line_doc`, `idx_inv_doc_line_product` |
| `src/main/java/com/ketoan/config/RestApplication.java` | `@ApplicationPath("/api")` | Tiền tố `/api` ⇒ `/api/inventory/docs` |
| `src/main/resources/db/migration/V00006__document_data.sql` | **Dữ liệu mẫu phiếu kho** (thêm 16/10/2026) | 9 phiếu (PN0001–0003, PX0001–0003, PT0001–0003) + 17 dòng hàng; ngày lùi 1–35 ngày so với `CURRENT_DATE`; tham chiếu danh mục theo `code`; mọi INSERT có `WHERE NOT EXISTS` (chạy lại an toàn); đồng bộ `inv_doc_counter.last_no`; có `DO $$ … RAISE WARNING/NOTICE` kiểm tra sau khi seed |
| `src/main/resources/application.properties` | Cấu hình | `quarkus.hibernate-orm.database.generation=none` ⇒ **schema chỉ đổi qua Flyway** |

**Cơ chế backend cần nhớ (rất dễ vỡ khi sửa):**
- `create()`: `d.id = null` + mọi `lines[].id = null` (server cấp khoá) → sinh `no` → `d.persist()` (cascade cả `lines`).
- `update()`: gán lại `partner/bank/date/note`, rồi **`d.lines.clear()` + add lại toàn bộ** ⇒ dòng cũ bị xoá (orphanRemoval) và **id mới** được cấp.
- `delete()` / `bulkDelete()` dùng Panache (`deleteById`, `delete("id in ?1", ids)`) — xoá `inv_doc` ⇒ cascade xoá `inv_doc_line`.
- ⚠️ `inv_doc_counter` **đã có trong schema nhưng KHÔNG được dùng** ⇒ số phiếu sinh bằng `InvDoc.count("type", type) + 1` (dễ trùng khi đồng thời).
- ⚠️ `qty`/`price` là `long` trong Java nhưng `numeric(18,3)`/`numeric(18,2)` trong DB ⇒ mất phần thập phân (P0 #9).

---

## 3. FRONTEND FILES

| File | Vai trò | Chi tiết cần biết |
| :--- | :--- | :--- |
| `src/main/webui/src/plugins/inventory/index.jsx` | **Toàn bộ plugin** (~783 dòng) | Xem bảng thành phần bên dưới |
| `src/main/webui/src/api/inventoryApi.js` | **API client duy nhất của domain kho** (FE-ST8) | `list(params)` (có querystring) / `get` / `create` / `update` / `delete` / `bulkDelete` |
| ~~`src/main/webui/src/core/inventoryApi.js`~~ | ✅ **đã xoá (16/10/2026)** — trước đây là bản trùng; plugin nay import `../../api/inventoryApi.js` | — |
| `src/main/webui/src/core/http.js` | HTTP client | `credentials:'include'`, `HttpError(status,message,details)`, 204 ⇒ `null` |
| `src/main/webui/src/core/masterdata.js` | Nguồn danh mục | `suppliersStore/customersStore/banksStore/materialsStore`; `searchSuppliers/Customers/Banks/Materials`; `vnd()` |
| `src/main/webui/src/core/Autocomplete.jsx` | Ô chọn có gợi ý | debounce 250ms, `fetcher(q)`, `onCreate(name)`, `value={id,name}`, chuẩn hoá bỏ dấu để so trùng tên |
| `src/main/webui/src/core/confirm.jsx` | Xác nhận xoá | `useConfirm()` dùng cho xoá phiếu / xoá dòng |
| `src/main/webui/src/core/ui.jsx` · `Denied.jsx` | UI chung | `<Loading/>`; `<Denied/>` khi thiếu `inventory.read` |
| `src/main/webui/src/core/Shell.jsx`, `plugins.js`, `permissions.js` | Hạ tầng | Cấp `{state,setState,can,bus,role}`; đăng ký plugin (bỏ qua nếu nằm trong `SKIPPED_PLUGINS`); key `inventory` trong ma trận quyền |

**Thành phần bên trong `plugins/inventory/index.jsx`:**

| Khối | Tên | Vai trò |
| :--- | :--- | :--- |
| 11-14 | `today()`, `PREFIX`, `lineTotal(lines)`, `blankDoc(type)` | Hằng số/tiện ích nghiệp vụ |
| 16-100 | **Module store** `lastQuery`, `st{docs,total,loading,error}`, `useDocs()`, `load(params)`, `resetDocs()` (+`registerReset`), `saveDoc()`, `removeDoc()`, `removeDocs()`, `search()` | Nguồn dữ liệu của plugin (pattern `useSyncExternalStore`), gọi `inventoryApi`; giữ `lastQuery` để ⟳/sau khi ghi tải lại đúng trang |
| 80-129 | `messages` | ~90 key `inv.*` (vi + en) |
| 131-133 | `NO_FILTERS`, `EMPTY_VIEW`, `PAGE_SIZES` | Hằng số state (⚠️ `EMPTY_VIEW` **không** gồm `selected`) |
| 135-138 | `filterDefs(t)` | Lọc theo `dateFrom`/`dateTo` |
| 141-153 | `filterDefs(t)` | Lọc theo `dateFrom`/`dateTo` (gửi lên server) |
| 155-168 | `buildQuery(state)` | Dựng tham số truy vấn server: `q/type/dateFrom/dateTo/page/pageSize/sort/dir` |
| ~~`SORT_GET`, `applyView`~~ | ✅ **đã xoá (16/10/2026)** — lọc/sắp xếp/phân trang nay do `InvDocResource.list` thực hiện | — |
| 171-191 | `CSS` | CSS cục bộ (draghandle, dropbefore/after, masterhead…) |
| 195-214 | `Menu` / `ribbon` | Sidebar lọc loại phiếu; Ribbon: phiếu nhập/xuất/trả + Import |
| 218-275 | `norm`, `IMPORT_COLS`, `IMPORT_REQUIRED`, `TEMPLATE_CSV`, `downloadTemplate`, `parseCsv`, `parseNum`, `parseDate` | Tiện ích CSV |
| 278-370 | `importDocs(text,{can,t})` + `resolve`, `simpleAdd`, `partnerRes`, `bankRes`, `productRes` | Import phiếu: gom theo `ref`, tự tạo danh mục còn thiếu (nếu `catalog.create`) |
| 373-427 | `HeaderCheck`, `Toolbar`, `Pager` | Chọn trang; search/date filter/count; phân trang |
| 430-612 | `ListView` | Bảng phiếu + **truy vấn server (debounce 300ms)** + xoá/xoá hàng loạt theo trang + import box + banner lỗi |
| 611-758 | `FormView` | Master–detail: autocomplete, dòng hàng, drag & drop, `doSave`, `doDelete` |
| 770-792 | `Body` + `View` + `export default` | `Body` giữ mọi hook và tự `load` theo truy vấn hiện tại; `View` kiểm tra quyền; ⚠️ **không còn** `setup(){ load(); }` (tránh gọi API trước khi đăng nhập) |

---

## 4. API ENDPOINTS

Base `/api/inventory/docs` (**yêu cầu đăng nhập** — `@Authenticated`; xoá cần role `admin`).

| Method + Path | Request | Response | FE gọi từ |
| :--- | :--- | :--- | :--- |
| `GET /api/inventory/docs` | `q`, `type`, `dateFrom`, `dateTo`, `page`, `pageSize`, `sort`, `dir` (đều tuỳ chọn) | `200` + `{ "items": InvDoc[], "total": N }` — `lines` vẫn nằm trong từng item; không tham số ⇒ tối đa 10.000 dòng | `load(query)` trong store; `plugin.refresh`; `search(q)` cho Global Search |
| `GET /api/inventory/docs/{id}` | — | `200` + `InvDoc` | `inventoryApi.get(id)` — hiện **không** dùng ở UI |
| `POST /api/inventory/docs` | body = `InvDoc` JSON (gồm `lines[]`) | `201` + `InvDoc` đã lưu (`id`, `no`, `lines[].id` do server cấp) | `saveDoc()` khi tạo mới |
| `PUT /api/inventory/docs/{id}` | body = `InvDoc` JSON | `200` + `InvDoc` (lines **được tạo lại**); `404` nếu id không tồn tại | `saveDoc()` khi sửa |
| `DELETE /api/inventory/docs/{id}` | — | `204` (`void`) | `removeDoc()` |
| `POST /api/inventory/docs/bulk-delete` | body = mảng id `[1,2,3]` | `204` (`void`) | `removeDocs()` |

**Payload `InvDoc` thực tế FE gửi lên (`saveDoc` đã chuẩn hoá):**
```json
{
  "id": 12,
  "type": "import",
  "date": "2026-10-16",
  "note": "Nhập đợt 1",
  "partner": { "id": "uuid-ncc", "name": "NCC Phong Vũ" },
  "bank":    { "id": "VCB-uuid", "name": "Vietcombank" },
  "lines": [
    { "id": null, "product": { "id": "uuid-vt", "name": "Bàn phím cơ" }, "qty": 10, "price": 700000 }
  ]
}
```
> `saveDoc()` chuyển `bank`/`partner` về `{id,name}` (bỏ field thừa như `hint`,`price` của autocomplete) và **null hoá id tạm của dòng**: `typeof l.id === 'number' && l.id < 100000000 ? l.id : null` — id tạm sinh bằng `Date.now()` (rất lớn) nên bị coi là tạm.

**Mã lỗi:** `GET` trả **400 `{"message":…}`** khi `type` ngoài `import/export/return` hoặc `dateFrom`/`dateTo` sai định dạng; `401` khi chưa đăng nhập; `403` khi user thường gọi `DELETE`/`bulk-delete`. Lỗi DB ở `create/update` (`partner_name` NOT NULL, FK `product_id`, `CHECK qty>0`, `UNIQUE(doc_id,pos)`, `UNIQUE(no)`) vẫn là **500** mặc định của Quarkus; `404` chỉ có ở `PUT`. Xem §7 và §9.

---

## 5. DATA FLOW

### 5.1 Nạp danh sách (lúc app khởi động + khi bấm ⟳)

```
main.jsx → import './plugins' → registerPlugin(inventoryPlugin)
     └─ plugin.setup() ⇒ load()
           └─ inventoryApi.list() ⇒ http.get('/inventory/docs')
                 └─ fetch('/api/inventory/docs', {credentials:'include'})
                       └─ InvDocResource.list() ⇒ InvDoc.listAll(Sort.desc("id"))
           └─ set({docs, loading:false}) → useDocs() phát cho mọi subscriber
View(props) ⇒ can('inventory','read') ? <Body/> : <Denied/>
Body ⇒ loading && !docs.length ? <Loading/> : (state.mode==='form' ? <FormView/> : <ListView/>)
```
> ⚠️ `setup()` chạy **ngay khi import module** (trước khi render/đăng nhập). Do backend chưa yêu cầu auth, request này **thành công cả khi chưa đăng nhập** (xem §7).

### 5.2 Lọc / sắp xếp / phân trang (client-side)

```
ListView: all = applyView(docs, {filterType, q, filters, sort})
  ├─ filterType (state.filterType, chọn từ Menu): all | import | export | return
  ├─ q: so khớp `no + partner.name + note` (lowercase)
  ├─ filters.dateFrom / dateTo: so sánh chuỗi ISO (d.date)
  └─ sort: SORT_GET[key] + localeCompare(numeric) / số học
page  = clamp(state.page, 1, totalPages)     ← tự lùi khi dữ liệu co lại
items = all.slice((page-1)*pageSize, page*pageSize)
```
⇒ Bộ lọc **chỉ áp dụng trên màn hình**; `load()` vẫn tải toàn bộ phiếu.

### 5.3 Tạo / sửa phiếu

```
Ribbon 📥/📤/↩️ ⇒ setState({mode:'form', editing: blankDoc(type)})   (history entry mới)
“✏️” trên dòng   ⇒ setState({mode:'form', editing: d})
FormView:
  ├─ Master: đổi `type` (chỉ khi tạo mới) ⇒ nguồn đối tác đổi (NCC ↔ KH); Autocomplete partner/bank + date + note
  ├─ Detail: Autocomplete product (chọn ⇒ tự điền price), qty, price, thành tiền, drag & drop / ▲▼, xoá dòng
  └─ Lưu (doSave):
       ├─ validate client: có partner, ≥1 dòng, mọi dòng có product.id và qty>0 (else alert inv.validate)
       └─ await saveDoc(editing)
             ├─ có payload.id ⇒ inventoryApi.update(id, payload) ⇒ PUT  → thay doc trong store
             └─ chưa có id    ⇒ inventoryApi.create(payload)     ⇒ POST → chèn doc lên đầu danh sách
                   └─ InvDocResource.create: id=null, lines[].id=null,
                        no = PREFIX[type] + %04d (theo count + 1), persist() (cascade lines)
       Thành công ⇒ về `mode:'list'` (phiếu mới: reset filter/page để thấy ngay)
       Thất bại  ⇒ alert(server message)
```

### 5.4 Xoá (1 phiếu / nhiều phiếu)

```
“🗑” (trong danh sách hoặc trong form) ⇒ confirm(...) ⇒ removeDoc(id) / removeDocs(ids)
   ⇒ DELETE /api/inventory/docs/{id}   |   POST /api/inventory/docs/bulk-delete
   ⇒ cập nhật store; DB CASCADE xoá inv_doc_line
Xoá hàng loạt: `selected` = các phiếu **đang khớp bộ lọc hiện tại** (an toàn hơn catalog)
   + nút “Chọn tất cả {n} phiếu” để chọn mọi kết quả đang lọc
```

### 5.5 Import CSV (nhiều phiếu)

```
“📂 Import” ⇒ chọn file ⇒ importDocs(text, {can,t})
  ├─ parseCsv + kiểm tra IMPORT_REQUIRED = [type, partner, product, qty]
  ├─ gom theo cột `ref` (ref trống ⇒ mỗi dòng 1 phiếu); master (type/partner/date/note/bank) lấy ở dòng đầu
  ├─ validate từng dòng TRƯỚC khi tạo danh mục (tránh tạo bản ghi mồ côi)
  ├─ resolve đối tác/ngân hàng/sản phẩm theo TÊN (bỏ dấu):
  │      (await searchXxx(name)).find(x => norm(x.name) === norm(name))  ??  can('catalog','create') ? add() : null
  │      (cache theo khoá `kind|name` để không tìm lại nhiều lần)
  └─ await saveDoc({type, partner, bank, date, note, lines})   ← từng phiếu; lỗi ghi vào errors[]
⇒ hiện ✅ / ⚠️; nếu ok>0 ⇒ reset filter + về danh sách
```

### 5.6 Global Search

```
Topbar (Shell) → nav.found → GlobalSearch render <Group plugin={inventory}>
  └─ plugin.search(q)   (KHÔNG gọi API — tìm trong store đã tải)
       ⇒ [{ id, title: doc.no, subtitle: doc.partner?.name ?? doc.type, state: {mode:'form', editing: doc} }]
     bấm kết quả ⇒ Shell.openResult ⇒ mở thẳng form phiếu đó
```

---

## 6. DEPENDENCIES

| Hướng | Thành phần | Ràng buộc |
| :--- | :--- | :--- |
| **Kho phụ thuộc** | `plugins/catalog` / `core/masterdata.js` (🚨 **chặt nhất**) | Tìm + tạo nhanh NCC/KH/NH/Vật tư; `can('catalog','create')` quyết định có được tạo mới khi import/autocomplete |
| | FK trong DB | `inv_doc_line.product_id → materials(id)` (**NOT NULL**, RESTRICT) và `inv_doc.bank_id → banks(id)` (SET NULL) ⇒ không xoá được vật tư/ngân hàng đang dùng |
| | `core/http.js` | `credentials:'include'`; 204 ⇒ `null` |
| | `core/Autocomplete.jsx` | Hợp đồng `fetcher(q) → [{id,name,hint?,price?}]` + `onCreate(name) → {id,name}` |
| | Flyway `V00005` | Schema + `UNIQUE(doc_id,pos)` (thứ tự dòng) + generated `line_total` |
| | Hibernate/Panache | `@OneToMany` + `@OrderColumn("pos")` là cách duy nhất lưu thứ tự dòng |
| **Phụ thuộc vào kho** | `core/GlobalSearch.jsx` | Plugin có `search` ⇒ xuất hiện trong kết quả tìm kiếm |
| | `core/permissions.js` | Key `inventory` (`read/create/update=true`, `delete=false`) |
| | `core/Shell.jsx` | `refresh` của plugin = `load()` (nút ⟳ trên Ribbon) |
| | `PROJECT_STATUS.md` / roadmap | Module này là nơi tập trung các việc P0/P1 còn lại |

---

## 7. SECURITY REQUIREMENTS

**Đang có:**
- `confirm()` trước mọi hành động xoá (1 phiếu, nhiều phiếu, dòng hàng).
- Validate nghiệp vụ ở client trước khi lưu (đối tác, dòng hàng, qty > 0) + ràng buộc **thật ở DB** (`NOT NULL`, `CHECK qty>0`, `CHECK price>=0`, `UNIQUE(doc_id,pos)`, `UNIQUE(no)`, FK).
- `partner`/`product` lưu **snapshot tên** (`Ref.name`) ⇒ sửa tên danh mục không làm lệch chứng từ cũ.
- Client gửi `id = null` cho bản ghi mới ⇒ server tự cấp khoá (không ghi đè bản ghi khác theo id từ client).
- FE hiển thị tiền qua `vnd()` (chỉ định dạng khi render).

**Bắt buộc kiểm tra khi thay đổi:**

- [x] ✅ **ĐÃ SỬA (16/10/2026) — P0 #1:** `InvDocResource` nay có `@Authenticated`; `DELETE` + `bulk-delete` yêu cầu `@RolesAllowed("admin")`; `bulk-delete` chặn rỗng và > 500 id. **Khi sửa tiếp module này MUST giữ các annotation đó** (CS-S1/CS-S2).
- [ ] ⚠️ Khi bật/đổi cơ chế auth của Kho: kiểm tra FE đã xử lý 401 (đã có `configureHttp({onUnauthorized})` trong `AuthProvider`) và **không** load dữ liệu trước khi đăng nhập (đã bỏ `setup(){}`).
- [ ] **Thiếu validate ở server:** `create()`/`update()` không kiểm tra `type` hợp lệ, `partner` bắt buộc, `lines` không rỗng, `qty > 0` ⇒ dữ liệu sai trả **500** thay vì `400 {"message":…}`. Nên bổ sung theo mẫu `MasterResource.validate()`.
- [ ] **Sinh số phiếu không an toàn khi đồng thời:** `InvDoc.count("type") + 1` ⇒ 2 người lưu cùng lúc có thể ra cùng `no` ⇒ `UNIQUE(no)` báo lỗi 500 cho người sau. Dùng `inv_doc_counter` (`UPDATE … RETURNING last_no`) đã có sẵn trong schema.
- [ ] **Không tin `id` từ client:** hiện `update()` lấy `findById(id)` từ path nên an toàn; nếu refactor thành "upsert theo body.id" thì phải kiểm tra quyền của bản ghi đó.
- [ ] **Không tin `lineTotal`** — là cột generated ở DB, FE chỉ tính để hiển thị; đừng gửi/ghi giá trị này từ client.
- [ ] **Import CSV:** validate trước khi tạo danh mục (đã đúng) — giữ nguyên thứ tự này để tránh tạo dữ liệu mồ côi; không dùng `eval`/công thức từ CSV.
- [ ] **Giới hạn dữ liệu tải về:** `GET` trả **toàn bộ** phiếu (không phân trang server) ⇒ khi dữ liệu lớn vừa chậm vừa dễ lộ dữ liệu; cần thêm `page/pageSize` + filter server-side.
- [ ] **Cookie/phiên:** module dựa vào `http.js` (`credentials:'include'`); nếu bật `@Authenticated`, hãy bảo đảm FE nhận 401 và điều hướng đăng nhập (hiện `configureHttp` **chưa** được gọi ⇒ 401 chỉ hiện banner).
- [ ] **Xoá phiếu là hành động phá huỷ** (CASCADE xoá hết dòng): nếu nghiệp vụ cần truy vết, chuyển sang soft-delete (`deleted_at`) hoặc chặn xoá phiếu đã ghi sổ.

---

## 8. COMMON EXTENSION POINTS

| Muốn làm gì | Backend | Frontend / DB |
| :--- | :--- | :--- |
| **Thêm loại phiếu mới** (vd. `transfer` = chuyển kho) | `InvDocResource.PREFIX` thêm `"transfer":"PC"`; validate `type` | Migration `V0000X`: sửa `CHECK (type IN (…))` + `INSERT INTO inv_doc_counter`; FE: i18n `inv.transfer`, `blankDoc`, danh sách trong `Menu` (`['all','import','export','return',…]`), nút Ribbon, `createPartner` chọn nguồn đối tác, hằng `PREFIX` đầu file |
| **Thêm cột vào master phiếu** (vd. `warehouse`, `dueDate`) | Field trong `InvDoc` (+ `@Column`) | Migration thêm cột; FE: input trong khối `.invmaster` của `FormView` + `blankDoc()` + i18n; muốn lọc/sort ⇒ thêm vào `Toolbar`/`SORT_GET`/`applyView` |
| **Thêm cột vào dòng hàng** (vd. `vat`, `unit`) | Field trong `InvLine` | Migration; FE: cột trong bảng dòng hàng + công thức thành tiền (nếu đổi tổng ⇒ sửa cả FE và generated column) |
| **Tìm kiếm/lọc/phân trang server-side** (việc P0 #11) | `list()` nhận `q/page/pageSize/sort/dir/type/dateFrom/dateTo` và trả `{items,total}` (mẫu `MasterResource.list`) | `inventoryApi.list(params)`; `ListView` thay `applyView` bằng `useQuery` (mẫu plugin `catalog`) — nên tái dùng `useAsyncQuery` |
| **Dùng `inv_doc_counter`** để sinh số phiếu an toàn | Native query `UPDATE inv_doc_counter SET last_no = last_no + 1 WHERE type = :type RETURNING last_no` trong transaction rồi ghép tiền tố (chú thích sẵn ở cuối `V00005`) | FE không cần đổi (server vẫn trả `no`) |
| **Đổi cách sắp xếp dòng** | `@OrderColumn("pos")` + `UNIQUE(doc_id,pos)` — giữ nguyên | FE `moveLine` (drag & drop / ▲▼); nếu thêm API "move line" riêng ⇒ dễ vỡ unique tạm thời |
| **Thêm trạng thái phiếu** (nháp/đã duyệt/đã ghi sổ) | Field `status` + validate chuyển trạng thái | Migration + i18n + Ribbon (Duyệt/Huỷ duyệt) + chặn sửa/xoá theo trạng thái |
| **In phiếu** | Không cần backend (hoặc endpoint trả HTML/PDF) | Đã có nút `print` chung trên Ribbon (`window.print()`); muốn mẫu in ⇒ thêm CSS `@media print` |
| **Tính tồn kho** (nhập − xuất) | Cần query tổng hợp (`sum(qty) group by product`) — **chưa có** | Plugin mới `stock` hoặc tab trong kho |
| **Đính kèm chứng từ** | Bảng `inv_doc_file` + endpoint upload | FE: input file + danh sách file |
| **Ghi log ai sửa gì** | Cột `created_by`/`updated_by` **đã có trong schema** nhưng chưa bao giờ được ghi | Set từ JWT trong `create/update`, hiển thị ở form/danh sách |
| **Kiểm tra tồn kho trước khi xuất** | Validate trong `create/update` khi `type='export'` | FE hiện không chặn âm kho |
| **Tách logic khỏi Resource** | Khi nghiệp vụ phức tạp (duyệt, tồn kho): tạo `service/InvDocService.java` (`@ApplicationScoped`, `@Transactional`) theo mẫu `AuthService` | Giữ Resource mỏng |

---

## 9. RISKS WHEN MODIFYING

### 🔴 Rủi ro cao

| # | Rủi ro | Nguyên nhân | Cách tránh |
| :- | :--- | :--- | :--- |
| I1 | **Bỏ `@OrderColumn("pos")` hoặc `UNIQUE(doc_id,pos)`** | Thứ tự dòng (kéo thả) mất, hoặc lỗi ràng buộc | Giữ cả 3: `@OrderColumn`, `pos int NOT NULL`, `UNIQUE(doc_id,pos)` |
| I2 | **Đổi cách `update()` xử lý `lines`** (clear + add lại) sang merge theo id | FE luôn null hoá `lines[].id`; nếu server "merge" theo id thì id tạm/lớn sẽ gây lỗi FK/unique | Nếu đổi sang merge: bỏ null-hoá ở FE **và** xử lý `pos` khi chèn/xoá xen kẽ |
| I3 | **Đổi heuristic id tạm trong `saveDoc`** (`id < 100000000`) | Dựa vào giả định "id thật luôn nhỏ, id tạm = `Date.now()`"; nếu id thật vượt 100 triệu hoặc `nextId()` đổi ⇒ dòng cũ bị coi là tạm và mất | Thay bằng cờ rõ ràng (`_temp`/`isNew`) |
| I4 | **Đổi response shape của `GET list()`** (mảng → `{items,total}`) | `load()` đã chịu được cả hai (`Array.isArray(res) ? res : res?.items ?? []`) nhưng `search()`/`saveDoc()`/`removeDoc()` đều làm việc với `st.docs` dạng mảng | Nếu đổi, kiểm tra **cả 4** hàm trong module store |
| I5 | **Gỡ `cascade = ALL, orphanRemoval = true`** | Sửa phiếu để lại dòng "mồ côi" hoặc lỗi FK khi xoá | Giữ cascade + orphanRemoval trên `InvDoc.lines` |
| I6 | **Sửa `V00005__document.sql` đã chạy** | Flyway checksum mismatch ⇒ app **không khởi động** | Thêm `V0000X` mới (ALTER/constraint) |
| I7 | **Đổi kiểu `id` (`Long` → `String`) hoặc bỏ `GeneratedValue`** | FE gửi id số; `bulk-delete` nhận `List<Long>`; URL `/{id}` parse số | Nếu đổi: sửa `InvDocResource`, `inventoryApi`, `saveDoc` |
| I8 | **Bỏ `d.id = null` trong `create()`** | Client có thể ghi đè bản ghi có cùng id (upsert ngầm) | Giữ `d.id = null` + `lines[].id = null` |

### 🟠 Rủi ro trung bình

| # | Rủi ro | Nguyên nhân | Cách tránh |
| :- | :--- | :--- | :--- |
| I9 | **Số phiếu trùng khi lưu đồng thời** | `count + 1` (không lock) + `UNIQUE(no)` ⇒ 500 | Dùng `inv_doc_counter`; hoặc bắt lỗi unique rồi retry |
| I10 | **`long` vs `numeric`** | `qty`/`price` khai báo `long`, DB `numeric(18,3)/(18,2)` ⇒ mất phần thập phân | Đổi sang `BigDecimal` (P0 #9) + cập nhật input/`vnd()` nếu cho nhập số lẻ |
| I11 | **Lỗi DB ⇒ 500 không có message thân thiện** | Không có `flushOrConflict`/`validate` như `MasterResource` | Thêm validate + try/catch ⇒ `{"message":…}` (400/409) |
| I12 | ✅ **Đã sửa (16/10/2026)**: `GET` nay có `q/type/dateFrom/dateTo/page/pageSize/sort/dir` ⇒ `{items,total}`; FE không còn tải toàn bộ | — | Còn lại: payload vẫn kèm `lines` ⇒ cân nhắc DTO danh sách (không kèm lines + `grandTotal`) |
| I13 | ✅ **Đã sửa (16/10/2026)**: bỏ `setup(){ load(); }` — `Body` tự load sau khi đăng nhập | — | Giữ nguyên: không thêm `setup()` gọi API khi chưa có phiên |
| I14 | **Đổi `EMPTY_VIEW`** | Nhiều `setState({...EMPTY_VIEW})` dựa vào việc reset filter/page; `selected` **không** nằm trong `EMPTY_VIEW` | Nếu muốn reset cả lựa chọn ⇒ sửa **tất cả** call-site |
| I15 | **`PREFIX` khai báo ở 2 nơi** | `InvDocResource.PREFIX` (server) và `PREFIX` (FE) ⇒ thêm loại phiếu mà quên 1 bên thì số phiếu hiển thị sai | Sửa cả 2 (hoặc để server trả `no` và FE không tự tính) |
| I16 | **`Autocomplete` tạo danh mục ngay khi chọn "➕"** | `createMaterial` mặc định `price: 0, unit: 'cái', typeId: null` ⇒ vật tư rác nếu đổi ý | Cân nhắc yêu cầu nhập giá/đơn vị khi tạo nhanh |
| I17 | **`selected` chứa id không còn trong bộ lọc** | `ListView` chỉ lấy `all.filter(d => selSet.has(d.id))` ⇒ xoá hàng loạt vẫn an toàn theo bộ lọc đang xem | Giữ cách lọc này khi refactor |

### 🟡 Lưu ý phạm vi

- `plugins/inventory/index.jsx` là **file lớn nhất dự án (~783 dòng)** và có **nhiều khối trùng tên với plugin `catalog`** nhưng khác nội dung: `CSS`, `HeaderCheck`, `Toolbar`, `Pager`, `norm`, `parseCsv`, `parseNum`, `downloadTemplate`, `messages`. Khi grep theo tên, hãy chắc chắn đang ở đúng file.
- Repo còn `plugins/inventory/index copy.jsx` và `index copy 2.jsx` (bản cũ) ⇒ **đừng sửa nhầm**.
- ⚠️ **Hai bản `inventoryApi.js`**: plugin đang import bản trong `core/`; bản ở `src/api/` mới đúng chuẩn thư mục. Thống nhất 1 chỗ trước khi sửa.
- `webui-v1` không có module kho — không liên quan.
- Khi viết test: `lines` phải gửi kèm (vì `create` cascade). Hiện endpoint chưa được bảo vệ nên test **không** cần cookie — sau khi vá P0 #1 thì phải đăng nhập lấy cookie `token`.





