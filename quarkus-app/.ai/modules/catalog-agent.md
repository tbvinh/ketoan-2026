# catalog-agent.md — Module DANH MỤC (Master Data / Catalog)

> **Plugin id (phân quyền):** `catalog` · **Icon:** 🗂️ · **order:** 6 · **Route:** `#{"pluginId":"catalog", …}` (hash)
> **Backend route gốc:** `/api/{suppliers|customers|materials|material-types|banks|accounts}` · **Bảng DB:** 6 bảng danh mục
> **Trạng thái:** ✅ hoạt động (~95%) · **Cập nhật:** 16/10/2026 · **Phiên bản:** `1.0.0-SNAPSHOT`
> **Đọc trước:** [`PROJECT_GUIDE.md`](../../PROJECT_GUIDE.md) §2.3 (`MasterResource`), §2.4 (hợp đồng REST), §3.4 (store layer), §6.6 (thêm danh mục mới), §7.1 #2 (P0 quyền ghi)
> **Tài liệu liên quan:** [`COMPONENT_MAPPING.md`](../../COMPONENT_MAPPING.md) §1.13, §2.1, §3.1–3.2

---

## 1. PURPOSE — Mục đích

Module **danh mục dùng chung** — nguồn dữ liệu nền cho mọi nghiệp vụ khác (đặc biệt là Kho). Quản lý **6 danh mục** trong **một plugin duy nhất** (đổi danh mục bằng `state.category`, không tạo plugin mới):

| `category` | Nhãn | Bảng | Tiền tố mã | `code` bắt buộc |
| :--- | :--- | :--- | :--- | :--- |
| `suppliers` | Nhà cung cấp | `suppliers` | `NCC` (tự sinh) | ✖ |
| `customers` | Khách hàng | `customers` | `KH` (tự sinh) | ✖ |
| `materials` | Vật tư | `materials` | `VT` (tự sinh) | ✖ |
| `materialTypes` | Loại vật tư | `material_types` | *(không có)* | ✖ |
| `banks` | Ngân hàng | `banks` | *(không có)* | ✔ |
| `accounts` | Tài khoản kế toán | `accounts` | *(không có)* | ✔ |

**Năng lực đang có:**
1. CRUD 1 bản ghi (form inline cùng trang — không modal).
2. **Tìm kiếm mờ** `q` trên các cột text (server-side, có index `gin_trgm`).
3. **Bộ lọc riêng theo danh mục** (vật tư: loại + khoảng giá; NCC/KH: có/không điện thoại; ngân hàng: chi nhánh; TK: nhóm 1xx…9xx).
4. **Sắp xếp** theo cột (whitelist server) + **phân trang server-side**, debounce 300ms.
5. **Xoá hàng loạt** (chọn theo dòng / cả trang, giữ lựa chọn qua trang).
6. **Import CSV** + **tải file mẫu** (UTF-8 BOM, hỗ trợ `,`/`;`; tự tạo loại vật tư mới nếu có quyền).
7. Cung cấp **store + hàm autocomplete** cho module Kho (`suppliersStore.search`, `searchMaterials`, …).

---

## 2. BACKEND FILES

| File | Vai trò | Chi tiết cần biết |
| :--- | :--- | :--- |
| `src/main/java/com/ketoan/resource/MasterResource.java` | **Lớp cha generic — trái tim của module** (`abstract`) | `@Authenticated` ở class; inject `EntityManager` + `ObjectMapper`; hooks `type()`, `searchFields()`, `codePrefix()`, `codeRequired()`, `from()`, `sortable()`, `applyFilters()`, `normalize()`, `validate()`; inner `Where` (builder + named params); `first()`, `nextCode()`, `flushOrConflict()`, `bad()`; endpoints `list/get/create/update/delete` |
| `src/main/java/com/ketoan/resource/SupplierResource.java` | `@Path("/suppliers")` | `searchFields = code,name,address`; `codePrefix="NCC"`; `applyFilters → phoneFilter`; `sortable` gồm `phone`; `static phoneFilter(f,w)` được **CustomerResource tái dùng** |
| `src/main/java/com/ketoan/resource/CustomerResource.java` | `@Path("/customers")` | `codePrefix="KH"`; lọc phone dùng chung `SupplierResource.phoneFilter` |
| `src/main/java/com/ketoan/resource/MaterialResource.java` | `@Path("/materials")` | `codePrefix="VT"`; `from()` join `MaterialType t`; `sortable` thêm `typeName → t.name`; `applyFilters`: `typeId`, `priceMin`, `priceMax`; `normalize()`: `""` ⇒ `null` cho `typeId`/`unit` |
| `src/main/java/com/ketoan/resource/MaterialTypeResource.java` | `@Path("/material-types")` | Chỉ `searchFields = name`; **không** có `codePrefix` (dù entity có cột `code`) |
| `src/main/java/com/ketoan/resource/BankResource.java` | `@Path("/banks")` | `codeRequired = true`; lọc `branch` (like); `sortable` thêm `branch` |
| `src/main/java/com/ketoan/resource/AccountResource.java` | `@Path("/accounts")` | `codeRequired = true`; lọc `group` = chữ số đầu của `code` (`e.code like '1%'`) |
| `src/main/java/com/ketoan/entity/MasterEntity.java` | `@MappedSuperclass` cho 6 entity | `String id` (UUID sinh bằng `@PrePersist generateId()`), `code`, `name` — **không** dùng `@GeneratedValue` |
| `src/main/java/com/ketoan/entity/Supplier.java` · `Customer.java` | `suppliers` / `customers` | `+ phone`, `+ address` |
| `src/main/java/com/ketoan/entity/Material.java` | `materials` | `+ unit`, `+ price(long)`, `+ typeId` (`@Column(name="type_id")`) |
| `src/main/java/com/ketoan/entity/MaterialType.java` · `Bank.java` · `Account.java` | `material_types` / `banks` / `accounts` | `Bank` `+ branch`; `MaterialType`,`Account` không thêm field |
| `src/main/resources/db/migration/V00003__add_master_data.sql` | **Tạo schema 6 bảng** | `pg_trgm`; mỗi bảng: `PK varchar(36)`, `UNIQUE INDEX uq_<b>_code_lower (LOWER(code)) [WHERE code IS NOT NULL]`, `idx_<b>_name_lower`, GIN trgm cho `code/name/phone/address/branch`; `materials.type_id FK → material_types ON DELETE RESTRICT` |
| `src/main/resources/db/migration/V00004__master_date_dummy.sql` | Dữ liệu mẫu | Seed danh mục tiếng Việt (chỉ chạy khi DB mới) |
| `src/main/java/com/ketoan/config/RestApplication.java` | `@ApplicationPath("/api")` | Tiền tố `/api` cho 6 resource |
| `src/main/resources/application.properties` | Cấu hình chung | Không có cấu hình riêng cho danh mục; chỉ cần datasource + `quarkus.hibernate-orm.database.generation=none` |

> ⚠️ Không có tầng Repository/Service cho danh mục — **mọi logic nằm ở `MasterResource` + lớp con**. Muốn thêm danh mục mới: xem §8 và [`PROJECT_GUIDE.md`](../../PROJECT_GUIDE.md) §6.6.

---

## 3. FRONTEND FILES

| File | Vai trò | Chi tiết cần biết |
| :--- | :--- | :--- |
| `src/main/webui/src/plugins/catalog/index.jsx` | **Toàn bộ plugin** (1 file, ~640 dòng) | Xem bảng thành phần bên dưới |
| `src/main/webui/src/core/masterdata.js` | **Khai báo 6 store + hàm search + `vnd`** | `makeStore(prefix, resource, seed)` chọn mock/real theo `USE_REAL_API`; `suppliersStore/customersStore/banksStore/materialTypesStore/materialsStore/accountsStore`; `searchSuppliers/Customers/Banks/Materials`; `resetAllStores()`; `matchName()` (⚠️ không dùng) |
| `src/main/webui/src/core/createstore.js` | Store **API thật** | `buildQS({q,page,pageSize,sort,filters})`; `normalize(res)` ⇒ `{items,total}`; `use()`, `useQuery()`, `search()`, `add/update/remove` (không lạc quan + `invalidate()`), `reset()` |
| `src/main/webui/src/core/mockstore.js` | Store **giả lập** (khi `VITE_USE_REAL_API` falsy) | `queryLocal()` mô phỏng q/filters/sort/paging **đúng hợp đồng server**; `mockConfig.failRate` để thử nhánh lỗi; seed nằm trong `masterdata.js` (~100 NCC, 3 KH, 3 NH, 3 loại, 5 vật tư, 3 TK) |
| `src/main/webui/src/core/config.js` | Cờ nguồn dữ liệu | `USE_REAL_API = ['1','true','yes'].includes(VITE_USE_REAL_API)` |
| `src/main/webui/src/core/http.js` | HTTP client dùng cho store | `http.get/post/put/delete` + `credentials:'include'`; ném `HttpError(status,message,details)`; `status===204 ⇒ null` |
| `src/main/webui/src/core/useasyncquery.js` | Hook tải dữ liệu | `useAsyncQuery(key, fetcher, {enabled, refresh})` → `{data,error,fetching,loading,reload}`; `AbortController` |
| `src/main/webui/src/core/confirm.jsx` | Xác nhận xoá | `useConfirm()` ⇒ `Promise<boolean>` (dùng cho xoá 1 dòng + xoá hàng loạt) |
| `src/main/webui/src/core/ui.jsx` · `Denied.jsx` | UI chung | `<Loading/>` khi `loading`; `<Denied/>` khi thiếu quyền `read` |
| `src/main/webui/src/core/Shell.jsx` · `plugins.js` · `permissions.js` · `i18n.jsx` | Hạ tầng plugin | Cấp props `{state,setState,can}`; đăng ký plugin + `messages`; `can('catalog', …)` |

**Thành phần bên trong `plugins/catalog/index.jsx` (theo thứ tự khai báo):**

| Khối | Tên | Vai trò |
| :--- | :--- | :--- |
| ~10-17 | `CATS` | Mảng 6 danh mục `{id, icon, store}` — **nguồn duy nhất để render Menu + tra store** |
| 19-68 | `messages` | ~50 key i18n `cat.*` (vi + en) |
| 72-76 | `NO_FILTERS`, `NO_SELECTION`, `EMPTY_VIEW`, `PAGE_SIZES` | Hằng số module — dùng làm tham chiếu ổn định cho `setState` (không tạo object mới) |
| 80-97 | `filtersFor(id, t, types)` | Định nghĩa bộ lọc **theo danh mục** (`kind: select\|number\|text`) → gửi thẳng lên query string |
| 100-107 | `useDebounced(value, ms=300)` | Trì hoãn 300ms cho ô tìm kiếm/lọc |
| 112-136 | `schemaFor(id, t, types)` | Định nghĩa **cột bảng + form** (`key`, `label`, `type`, `display`, `sortKey`, `render`) |
| 141-148 | `IMPORT_SPEC` | Cột/required/sample CSV cho từng danh mục |
| 150-164 | `norm`, `csvEsc`, `downloadTemplate` | Chuẩn hoá bỏ dấu; escape CSV; sinh file mẫu UTF-8 BOM |
| 167-193 | `parseCsv`, `parseNum` | Parser CSV nhỏ (hỗ trợ `"…"`, `,`/`;`); parse số kiểu `700.000` |
| 196-246 | `importRows(text, {catId, store, types, can, t})` | Import: đọc header ⇒ validate ⇒ chống trùng trong file ⇒ **tự tạo loại vật tư** nếu `can('catalog','create')` ⇒ `store.add` ⇒ trả `{ok, errors[]}` |
| 250-262 | `CSS` | CSS cục bộ (zebra, bulkbar, importbox…) chèn qua `<style>` |
| 266-284 | `Menu` / `ribbon` | Sidebar 6 danh mục; Ribbon: Thêm mới + Import |
| 287-351 | `HeaderCheck`, `Toolbar`, `Pager` | Checkbox indeterminate; thanh search/filter/count; phân trang |
| 354-599 | `Body` | **Chứa mọi hook**: `useQuery` (debounce), form sửa (`editing`), sort, chọn nhiều + `onBulkDelete`, import (`onFile`) |
| 601-612 | `View` + `export default` | `can('catalog','read')` ⇒ `<Denied/>`; `<Body key={props.state.category} …/>` (mount lại khi đổi danh mục) |

---

## 4. API ENDPOINTS

Tất cả endpoint **yêu cầu cookie JWT hợp lệ** (do `@Authenticated` trên `MasterResource`) nhưng **hiện KHÔNG phân biệt role** (xem §7).

### 4.1 Endpoint chung (giống nhau cho 6 danh mục)

| Method + Path | Query / Body | Response |
| :--- | :--- | :--- |
| `GET /api/<resource>` | *(không tham số)* — dùng cho dropdown | `{ "items":[…], "total":N }` — tối đa **10 000** dòng |
| `GET /api/<resource>` | `q`, `page`, `pageSize`, `sort`, `dir` + bộ lọc riêng | `{ "items":[…], "total":N }`; `pageSize` chặn trong `[1,100]`; `sort` qua whitelist; luôn thêm `, e.id asc` |
| `GET /api/<resource>/{id}` | — | `200` + entity hoặc `404` |
| `POST /api/<resource>` | JSON body (bỏ `id`) | `201` + entity đã lưu (server cấp `id` UUID và `code` nếu có `codePrefix`) |
| `PUT /api/<resource>/{id}` | JSON **partial** (bỏ `id`) | `200` + entity sau cập nhật; `404` nếu không tồn tại |
| `DELETE /api/<resource>/{id}` | — | `204`; `404` nếu không tồn tại |

### 4.2 Đường dẫn + đặc thù từng danh mục

| Resource | `@Path` | `searchFields` (cho `q`) | `codePrefix` | `codeRequired` | Bộ lọc riêng | `sortable` whitelist |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| `SupplierResource` | `/api/suppliers` | `code,name,address` | `NCC` | ✖ | `phone=has\|none` | `code,name,phone,address` |
| `CustomerResource` | `/api/customers` | `code,name,address` | `KH` | ✖ | `phone=has\|none` | `code,name,phone,address` |
| `MaterialResource` | `/api/materials` | `code,name` | `VT` | ✖ | `typeId`, `priceMin`, `priceMax` | `code,name,unit,price,typeName` |
| `MaterialTypeResource` | `/api/material-types` | `name` | ✖ | ✖ | *(không)* | `code,name` (mặc định) |
| `BankResource` | `/api/banks` | `code,name,branch` | ✖ | ✔ | `branch` (like) | `code,name,branch` |
| `AccountResource` | `/api/accounts` | `code,name` | ✖ | ✔ | `group` = `1…9` | `code,name` (mặc định) |

**Ví dụ gọi thật (khớp `createstore.buildQS`):**
```http
GET /api/materials?q=ban&page=1&pageSize=20&sort=typeName&dir=asc&typeId=<uuid>&priceMin=100000&priceMax=5000000
GET /api/suppliers?page=1&pageSize=5&sort=name&dir=desc&phone=none
GET /api/accounts?q=131&page=1&pageSize=20&group=1
```

### 4.3 Mã lỗi

| HTTP | Tình huống | Body |
| :--- | :--- | :--- |
| `400` | `name` trống; `code` trống khi `codeRequired`; JSON không map được | `{"message":"Tên không được để trống"}` |
| `401` | Thiếu/hết hạn cookie JWT | do Quarkus sinh |
| `404` | `em.find(type(), id)` không thấy | — |
| `409` | Trùng `code` (unique index `LOWER(code)`) **hoặc** xoá bản ghi đang được tham chiếu (FK) | `{"message":"Mã đã tồn tại hoặc dữ liệu không hợp lệ"}` / `{"message":"Không thể xóa: bản ghi đang được sử dụng"}` |
| `500` | Lỗi khác (vd. `priceMin` không parse được ⇒ `NumberFormatException`) | mặc định Quarkus |

---

## 5. DATA FLOW

### 5.1 Đọc danh sách (tìm/lọc/sort/phân trang)

```
Body()  ← props {state:{category,q,filters,sort,page,pageSize,…}, setState, can}
  ├─ types = materialTypesStore.use().items      ← tải TOÀN BỘ loại vật tư (đổ dropdown + hiển thị tên loại)
  ├─ critKey    = JSON.stringify({q, filters})
  ├─ settledKey = useDebounced(critKey, 300)     ← chờ 300ms người dùng ngừng gõ
  └─ cat.store.useQuery({q:settled.q, filters:settled.filters, page, pageSize, sort},
                        { enabled: critKey === settledKey })   ← hoãn gọi khi còn đang gõ
        └─ createStore(resource).useQuery
             ├─ buildQS ⇒ '/suppliers?q=…&page=…&pageSize=…&sort=…&dir=…&<filters>'
             ├─ useAsyncQuery(key, fetcher, {refresh: version})   ← version tăng sau add/update/remove
             │     └─ http.get(...) ⇒ fetch('/api/suppliers?…', credentials:'include')
             │           └─ SupplierResource.list() → MasterResource.list()
             │                 ├─ Where: q (lower like trên searchFields) + applyFilters()
             │                 ├─ sort qua sortable() whitelist (không khớp ⇒ mặc định e.name asc)
             │                 └─ em.createQuery("select e from Supplier e where … order by …") + count
             └─ normalize(res) ⇒ {items,total} ⇒ render bảng
  └─ useEffect: nếu page > totalPages ⇒ tự lùi về trang cuối còn dữ liệu
```

### 5.2 Tạo / sửa 1 bản ghi

```
Ribbon “➕ Thêm mới”  ⇒ setState({editing:{}})          (điều hướng thật — tạo history entry)
“✏️” trên dòng        ⇒ setState({editing:<row>})
Body nhận `editing` ⇒ render form (schemaFor quyết định input nào)
Bấm “Lưu”:
  ├─ add:    await cat.store.add(editing)          ⇒ http.post('/suppliers', body)
  │     └─ MasterResource.create(): body.remove("id") → mapper.convertValue
  │          → validate() → nếu code trống & có prefix: nextCode(prefix)
  │          → normalize() → em.persist → flushOrConflict()   [409 nếu trùng mã]
  │          ⇒ 201 + entity ⇒ store thêm vào cache + invalidate()
  └─ update: await cat.store.update(id, editing)   ⇒ http.put('/suppliers/'+id, body)
        └─ mapper.updateValue(e, body) → validate → normalize → flushOrConflict ⇒ 200
  Thành công ⇒ setState({editing:null})   |   Lỗi ⇒ giữ form + banner formError (e.message)
```

### 5.3 Xoá 1 dòng / xoá hàng loạt

```
“🗑” trên dòng ⇒ confirm(...) ⇒ cat.store.remove(id) ⇒ http.delete ⇒ 204 (hoặc 409 nếu FK)
Xoá hàng loạt:
  selSet = new Set(state.selected)   ← giữ khi đổi trang/sắp xếp; XOÁ khi đổi q/filters/danh mục
  HeaderCheck ⇒ togglePage() (chọn/bỏ tất cả dòng đang hiển thị)
  “Xoá đã chọn” ⇒ confirm(...) ⇒ for (const id of ids) await cat.store.remove(id)  ← tuần tự
      ├─ lỗi ⇒ gom vào `failed`, giữ `selected = failed` để thử lại
      └─ setState({bulkBusy:false, error}) + reload()
```
> ⚠️ **Không có endpoint bulk-delete cho danh mục** — FE gọi N lần `DELETE` (khác với kho có `/inventory/docs/bulk-delete`).

### 5.4 Import CSV

```
“📂 Import” ⇒ hiện importbox ⇒ chọn file (.csv)
  └─ importRows(text, {catId, store, types, can, t})
       ├─ parseCsv() (tự nhận dấu , hoặc ;) → so header với IMPORT_SPEC[catId].cols/required
       ├─ mỗi dòng: validate required, parseNum(price), chống trùng trong file (Set `seen`)
       ├─ materials: tìm loại theo tên (norm bỏ dấu); chưa có ⇒ nếu can('catalog','create') thì
       │              materialTypesStore.add({name}) rồi dùng id mới (⚠️ tạo bản ghi mồ côi nếu dòng sau lỗi)
       └─ await store.add(rec)  ← từng dòng; lỗi dòng nào ghi vào errors[]
  ⇒ setImp({result}) hiện ✅ ok + ⚠️ danh sách lỗi; nếu ok>0 ⇒ reset view + reload()
```

### 5.5 Vai trò "nhà cung cấp dữ liệu" cho module khác

```
plugins/inventory (FormView + importDocs)
  ├─ searchSuppliers / searchCustomers / searchBanks / searchMaterials(q)
  │     → store.search(q,{limit}) ⇒ GET /suppliers?q=…&page=1&pageSize=20   (real)
  │                                hoặc queryLocal(...)                    (mock)
  ├─ suppliersStore.add({name}) / banksStore.add({name}) / materialsStore.add({...})
  │     ⇒ POST /api/suppliers ⇒ trả {id,name} để gắn vào phiếu kho (Ref snapshot)
  └─ materialTypesStore.use().items ⇒ dropdown loại vật tư
```

---

## 6. DEPENDENCIES

| Hướng | Thành phần | Ràng buộc |
| :--- | :--- | :--- |
| **Catalog phụ thuộc** | `MasterEntity` | Mọi entity danh mục `extends MasterEntity` (id/code/name) — đổi lớp cha ⇒ phải sửa 6 entity + migration |
| | Flyway `V00003` (schema) + `V00004` (seed) | Cột/index phải khớp entity: `type_id`, `branch`, `phone`, `address`; `UNIQUE LOWER(code)` là chốt 409 |
| | `quarkus-rest-jackson` (`ObjectMapper`) | `convertValue`/`updateValue` là cơ chế map body → entity |
| | Store layer (`masterdata.js` → `createstore.js`) | Hợp đồng `GET ⇒ {items,total}`, `POST ⇒ 201 entity`, `DELETE ⇒ 204` |
| | **`Autocomplete` của kho** | `search()` trả mảng row; tên field phải có `{id, name}` |
| | i18n `cat.*` | Mọi nhãn cột/nút/filter lấy từ `messages` |
| **Phụ thuộc vào catalog** | `plugins/inventory` (🚨 **chặt nhất**) | Dùng `searchSuppliers/Customers/Banks/Materials`, `suppliersStore/customersStore/banksStore/materialsStore`, `vnd`, và `can('catalog','create')` để tạo nhanh danh mục |
| | `inv_doc` / `inv_doc_line` (FK) | `bank_id → banks(id)`, `product_id → materials(id)` ⇒ **không xoá được** ngân hàng/vật tư đang dùng (409) |
| | `core/GlobalSearch.jsx` | ⚠️ Plugin `catalog` **không có** hàm `search` ⇒ **không** xuất hiện trong kết quả Global Search (chỉ tìm trong kho + plugin legacy) |
| | `core/permissions.js` | Key `catalog` trong `PLUGIN_IDS`/`DEFAULT` (`read/create/update=true`, `delete=true`) |
| | `core/auth.jsx` | `resetAllStores()` (hiện **chưa** được gọi khi logout) |

---

## 7. SECURITY REQUIREMENTS

**Đang có:**
- `@Authenticated` ở `MasterResource` ⇒ mọi request phải có cookie JWT hợp lệ.
- Whitelist `sortable()` ⇒ **không** ghép chuỗi `sort` từ client vào JPQL (chống injection).
- `Where` dùng **named parameter** cho mọi giá trị lọc/`q` (không nối giá trị vào JPQL).
- `validate()` ở server (name bắt buộc, code bắt buộc theo danh mục) ⇒ không tin validate của FE.
- `UNIQUE INDEX LOWER(code)` ở DB ⇒ chống trùng mã kể cả khi 2 request đồng thời; `flushOrConflict()` đổi lỗi thành **409** (không lộ stacktrace 500).
- FK `ON DELETE RESTRICT` (materials→material_types) + `flushOrConflict` ⇒ không xoá dữ liệu đang dùng.
- FE render bằng React (escape tự động) ⇒ dữ liệu người dùng không chèn HTML.

**Bắt buộc kiểm tra khi thay đổi:**

- [ ] 🚨 **Đây là lỗ hổng P0 đang tồn tại:** bất kỳ user đã đăng nhập (role `user`) đều **tạo/sửa/xoá** được cả 6 danh mục. Nút bị disable trên UI chỉ là hình thức (`can()` phía client). Nếu cần đúng nghiệp vụ: thêm `@RolesAllowed("admin")` cho `POST/PUT/DELETE` (xem §8).
- [ ] `q`/filter **không được** đưa vào `order by` (chỉ `sortable()`), và tên field trong `searchFields()` phải là tên field entity (không phải tên cột).
- [ ] Thêm bộ lọc mới ⇒ nhớ validate kiểu (`Integer.parseInt`/`Long.parseLong` đang ném `NumberFormatException` ⇒ **500**, nên bọc lại thành 400).
- [ ] Không trả thêm cột nhạy cảm vào JSON entity (danh mục hiện trả toàn bộ field — chấp nhận được vì không có field riêng tư; đừng thêm field như `cost`/`salary` mà không cần).
- [ ] Import CSV do **client** parse ⇒ dữ liệu gửi lên vẫn phải qua `validate()` ở server; đừng tin `code` client gửi (server chỉ tự sinh khi **trống** ⇒ client có thể ép trùng mã và nhận 409).
- [ ] Xoá hàng loạt: FE gọi tuần tự N request ⇒ nên là **hành động có xác nhận** (đã có `confirm`) và có thể thất bại một phần (đã xử lý bằng `failed`).
- [ ] `GET` không tham số trả tới 10 000 dòng — chỉ dùng cho dropdown; không lạm dụng để "lấy hết" bảng lớn.
- [ ] Khi thêm danh mục: đừng đặt tên `@Path` chứa `auth`/`public` (sẽ bị `SecurityFilter` bỏ qua kiểm tra).

---

## 8. COMMON EXTENSION POINTS

| Muốn làm gì | Backend | Frontend |
| :--- | :--- | :--- |
| **Thêm 1 danh mục mới** | 1) migration `V0000X` (bảng + `UNIQUE LOWER(code)` + index name/trgm) 2) entity `extends MasterEntity` 3) `XxxResource extends MasterResource<T>` (`@Path`, `type()`, `searchFields()`, tuỳ chọn `codePrefix`) | 4) `masterdata.js`: `export const xxxStore = makeStore('TIỀN_TỐ', '/xxx', [])` 5) `CATS` + `schemaFor()` + `filtersFor()` + `IMPORT_SPEC` 6) `messages` key `cat.xxx` (vi + en) |
| Thêm **cột** vào danh mục có sẵn | Thêm field vào entity (+ migration) | Thêm entry vào `schemaFor()`; nếu không thuộc 6 danh mục gốc ⇒ thêm cả `IMPORT_SPEC` |
| Thêm **bộ lọc** | Override `applyFilters(f, w)` (+ dùng `first(f, key)`); cần join ⇒ override `from()` | Thêm entry vào `filtersFor()` (`kind: select\|number\|text`); thêm key i18n |
| Cho **sắp xếp** theo cột mới | Thêm vào `sortable()` (map `key → e.field`, hoặc `t.field` nếu join) | `schemaFor`: đặt `sortKey` nếu tên gửi lên khác `key` (mẫu `typeId → typeName`); mock: thêm `resolve.<key>` trong `masterdata.js` |
| Đổi **tiền tố mã** tự sinh | `codePrefix()` | — |
| Bắt buộc nhập mã | `codeRequired() → true` | `schemaFor` nên đánh dấu bắt buộc (hiện chưa có UI đánh dấu) |
| Thêm **cột render tuỳ biến** (badge, link, select) | — | `schemaFor`: `display(it)` (chỉ đọc) hoặc `render(editing, update)` (form) — mẫu ở `materials.typeId` |
| Thêm **import CSV** cho danh mục mới | — | Thêm `IMPORT_SPEC[catId] = {cols, required, sample}`; `importRows` lo phần còn lại |
| Đổi cách **tìm kiếm** (bỏ dấu tiếng Việt ở server) | `searchFields()` + điều kiện trong `list()` (hiện `lower like`, **không** bỏ dấu) | Mock đã bỏ dấu (`strip()`), real chưa ⇒ 2 chế độ **khác hành vi** |
| Thêm **bulk-delete API** cho danh mục | Thêm `@POST @Path("/bulk-delete")` trong `MasterResource` (theo mẫu `InvDocResource`) | Đổi `onBulkDelete` từ vòng lặp sang 1 request |
| Tách 1 danh mục thành **plugin riêng** | — | Tạo `plugins/<id>/index.jsx` theo hợp đồng plugin + bổ sung `PLUGIN_IDS`/`DEFAULT`/`NAMES` (xem `admin-agent.md`) |
| Đổi giao diện bảng dùng chung | — | ⚠️ `Toolbar`/`Pager`/`HeaderCheck` đang **trùng** với `plugins/inventory` — refactor phải làm ở **cả hai** (hoặc tách `core/DataTable.jsx`) |
| Phân quyền ghi theo từng danh mục | Cần `@RolesAllowed` + phân quyền ở mức resource | Hiện `can()` chỉ ở mức plugin `catalog`; muốn chi tiết hơn phải thêm key kiểu `catalog.suppliers.write` |

---

## 9. RISKS WHEN MODIFYING

### 🔴 Rủi ro cao

| # | Rủi ro | Nguyên nhân | Cách tránh |
| :- | :--- | :--- | :--- |
| C1 | **Đổi shape response `{items,total}`** | `createstore.normalize()` + `mockstore` + mọi bảng đều dựa vào đó | Giữ `{items,total}`; nếu buộc đổi, sửa `normalize()` + `queryLocal()` cùng lúc |
| C2 | **Đổi tên query param** (`q/page/pageSize/sort/dir`) hoặc tên filter | `buildQS` (real) **và** `queryLocal` (mock) phải khớp với tên server đọc | Sửa **3 nơi**: `createstore.buildQS`, `mockstore.queryLocal`, `applyFilters`/`list` của Resource |
| C3 | **Đổi interface store** (`use`, `useQuery`, `add`, `search`, `list`) | **`plugins/inventory` phụ thuộc trực tiếp** (autocomplete + tạo nhanh danh mục khi lập phiếu) | Giữ nguyên chữ ký; thêm method mới thay vì đổi method cũ; mock và real phải **cùng** interface |
| C4 | **Tạo `EMPTY_VIEW`/`NO_FILTERS`/`NO_SELECTION` mới mỗi lần render** | Đang được dùng làm tham chiếu ổn định cho `setState`/so sánh ⇒ có thể gây loop render/history | Giữ dạng hằng số module (như hiện tại) |
| C5 | **Bỏ debounce** (`enabled: critKey === settledKey`) | Sẽ bắn request mỗi ký tự ⇒ spam API, nhảy trang | Giữ cơ chế hoãn gọi + `useDebounced` |
| C6 | **Xoá `key={props.state.category}` ở `<Body>`** | Component không mount lại ⇒ state/hook của danh mục trước bị giữ lại | Giữ `key` |
| C7 | **Sửa file migration `V00003`/`V00004` đã chạy** | Flyway checksum mismatch ⇒ app **không khởi động** | Luôn thêm file `V0000X` mới |
| C8 | **Đổi `MasterEntity.generateId` (UUID `@PrePersist`) sang `@GeneratedValue`** | `inv_doc.bank_id`/`partner_id` là `varchar(36)`; đổi khoá sẽ vỡ FK/kiểu dữ liệu | Nếu đổi: sửa 6 entity + `V0000X` + `inv_doc`/`inv_doc_line` |

### 🟠 Rủi ro trung bình

| # | Rủi ro | Nguyên nhân | Cách tránh |
| :- | :--- | :--- | :--- |
| C9 | **`nextCode()` trùng mã khi 2 request đồng thời** | Đọc max rồi `+1`, không lock (tự nhận trong comment code) | 1 instance thì chấp nhận; scale: sequence/counter + retry khi 409 |
| C10 | **`NumberFormatException` ⇒ 500** | `Long.parseLong(min/max)` trong `MaterialResource.applyFilters` | Bọc try/catch ⇒ `bad("Giá không hợp lệ")` |
| C11 | **Đổi `typeName` (sortKey cột Loại vật tư)** | Phải khớp `sortable()` (`t.name`) + `from()` (`left join MaterialType t`) | Đổi **3 nơi**: `from()`, `sortable()`, `sortKey` trong `schemaFor` |
| C12 | **Quên `normalize()` cho field select mới** | `<select>` gửi chuỗi `""` ⇒ lỗi FK/kiểu dữ liệu | Thêm dòng xử lý `""→null` tương ứng |
| C13 | **Import tạo loại vật tư "mồ côi"** | `materialTypesStore.add` chạy trước khi dòng vật tư được lưu; dòng sau có thể lỗi | Validate toàn bộ trước khi tạo; hoặc chấp nhận + dọn định kỳ |
| C14 | **Import không kiểm tra trùng với DB** | `seen` chỉ chống trùng **trong file**; trùng DB ⇒ 409 từng dòng | Ghi rõ trong hint (đã có) hoặc pre-check bằng `store.search` |
| C15 | **Xoá hàng loạt không giới hạn** | `state.selected` giữ id qua trang ⇒ có thể chọn rồi xoá nhiều trang | Đã có `confirm` kèm số lượng; cân nhắc chặn khi > N (vd. 500) |
| C16 | **Mock và real lệch hành vi** | `queryLocal` bỏ dấu tiếng Việt + sort theo `strip()`; server thì không | Đừng "sửa bug" chỉ dựa vào chế độ mock |
| C17 | **`matchName` trong `masterdata.js` là code chết** | Không nơi nào dùng | Xoá khi dọn dẹp |
| C18 | **Plugin không có `search`** | Gõ tên NCC/vật tư ở ô Global Search **không** ra kết quả từ danh mục | Nếu cần: thêm `search: (q) => store.search(q).then(rows => rows.map(r => ({id, title, subtitle, state})))` |

### 🟡 Lưu ý phạm vi

- `catalog` là **1 plugin chứa 6 "module con"** ⇒ sửa `CATS`/`schemaFor`/`filtersFor`/`IMPORT_SPEC` là động tới **cả 6 danh mục**; sau khi sửa hãy kiểm tra lần lượt 6 tab.
- Repo còn **8 file backup**, trong đó `plugins/catalog/index copy.jsx`, `index copy 2.jsx`, `index copy 3.jsx` là phiên bản cũ của chính file này ⇒ **đừng sửa nhầm**; xoá theo guide §7.2 #12.
- `webui-v1` không có module danh mục (chỉ demo Fluent UI) — không liên quan.






