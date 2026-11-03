# SESSION.md — Nhật ký phiên làm việc

> **Cập nhật lần cuối:** 17/10/2026 · **Dự án:** `com.ketoan:quarkus-app` (`1.0.0-SNAPSHOT`) · **Người thực hiện:** Cline
> **Phiên P2 (17/10/2026 — mới nhất):** điều tra lỗi **`null value in column "doc_id"`** khi lưu phiếu kho → triển khai **Fix A** (mapping 2 chiều + cột `pos`) ⇒ **§10**, bàn giao **§11**.
> **Phiên P1 (16/10/2026):** phân tích dự án → tài liệu kiến trúc/quy tắc → implement **tìm kiếm phiếu kho ở server** → seed **dữ liệu mẫu V00006** ⇒ §0–§9 (giữ nguyên làm lịch sử).
> **Trạng thái hiện tại:** ✅ `POST`=201 / `PUT`=200 / `DELETE`=204 phiếu kho (đã test trên Postgres 15 thật) · ✅ build BE + FE pass · ⚠️ còn nợ: test tự động, `BigDecimal` cho `qty/price`, sinh số bằng `inv_doc_counter`, `grand_total`, `GET /docs/{id}` (405), **đồng bộ tài liệu sau Fix A**.
> **Tài liệu liên quan:** [`../DEBUG_REPORT.md`](../DEBUG_REPORT.md) · [`../IMPLEMENTATION_REPORT.md`](../IMPLEMENTATION_REPORT.md) · [`../BEFORE_AFTER.md`](../BEFORE_AFTER.md) · [`../PROJECT_GUIDE.md`](../PROJECT_GUIDE.md) · [`RULES.md`](./RULES.md) · [`modules/`](./modules/) · [`../PROJECT_STATUS.md`](../PROJECT_STATUS.md) · [`../CHANGELOG.md`](../CHANGELOG.md)

> 📌 **Phiên mới nhất nằm ở cuối file — §10 (Fix A `doc_id` NOT NULL) và §11 (bàn giao + prompt mở Task mới).**
> §0–§9 là nội dung phiên 16/10/2026, vẫn đúng và dùng làm tham chiếu; mục nào đã được phiên 2 đóng thì có ghi chú ✅ tại chỗ.

---

## 0. TL;DR (1 phút)

| # | Việc | Kết quả |
| :- | :--- | :--- |
| 1 | Phân tích toàn dự án, sửa hiểu nhầm "Spring Boot" | `PROJECT_GUIDE.md` (871 dòng) + `.ai/PROJECT_GUIDE.md` viết lại |
| 2 | Tài liệu 4 module + 1 tài liệu kiến trúc sâu | `modules/{auth,catalog,inventory,admin}-agent.md`, `modules/inventory-architect.md` |
| 3 | Bộ quy tắc phát triển có **Rule ID** | `RULES.md` (~600 dòng, nhãn MUST/MUST NOT/SHOULD) |
| 4 | **Feature: tìm kiếm/lọc/sort/phân trang phiếu kho ở SERVER** | `GET /api/inventory/docs?q&type&dateFrom&dateTo&page&pageSize&sort&dir` → `{items,total}` |
| 5 | Vá P0 bảo mật khi chạm module | `@Authenticated` + `@RolesAllowed("admin")` cho xoá; FE bỏ load trước đăng nhập |
| 6 | Seed dữ liệu mẫu | `V00006__document_data.sql`: 9 phiếu + 17 dòng, **idempotent**, kiểm chứng trên Postgres thật |

**Điểm cần nhớ nhất:** repo là **Quarkus 3.39.3 + Panache + Quinoa/React 18** — **KHÔNG** có Spring Boot, Repository, MapStruct, Axios, React Router. Mọi code mới phải theo `RULES.md`.

---

## 1. WHAT WAS COMPLETED — VIỆC ĐÃ HOÀN THÀNH

### 1.1 Tài liệu kiến trúc & chuẩn (docs-only, không sửa code)

| Việc | Nội dung |
| :--- | :--- |
| Phân tích backend | 25 file Java: Resource/Service/Entity/DTO/config, 5 migration, `pom.xml`, `application.properties` |
| Phân tích frontend | `src/main/webui` (plugin registry, store layer, i18n, permission); `webui-v1` = bản thử nghiệm, không dùng |
| Xác định kiến trúc thật | `Resource → (Service) → EntityManager/Panache → PostgreSQL`; **không có tầng Repository** |
| `PROJECT_GUIDE.md` (root) | 7 mục: overview, backend, frontend, module map, naming, coding standards, **38 khuyến nghị P0/P1/P2** kèm bằng chứng file:line |
| `.ai/PROJECT_GUIDE.md` | Viết lại bản digest (bản cũ ghi sai Spring Boot/MapStruct/Axios/React Router) |
| `.ai/modules/auth-agent.md` | 9 mục: purpose → backend/frontend files → API → data flow → deps → security → extension → risks (A1–A15) |
| `.ai/modules/catalog-agent.md` | 9 mục + hooks `MasterResource`, 6 danh mục, rủi ro C1–C18 |
| `.ai/modules/inventory-agent.md` | 9 mục + rủi ro I1–I17 (sau đó cập nhật theo feature) |
| `.ai/modules/admin-agent.md` | 9 mục + rủi ro A1–A13 (nổi bật: thêm `PLUGIN_IDS` mà thiếu `DEFAULT` ⇒ **trắng màn hình**) |
| `.ai/modules/inventory-architect.md` | 10 mục chuyên sâu: flow (Mermaid), DDL, vòng đời InvDoc/InvLine, API, UI, state 3 tầng, validation matrix, sổ rủi ro S-1…S-15, **12 pattern A–L** |
| `.ai/RULES.md` | Backend (BE-R/E/F/P), Frontend (FE-PL/ST/AP/PE), Standards (CS-N/S/R/F) + checklist DoD + nợ đã biết + bảng tra cứu |

### 1.2 Feature: Tìm kiếm phiếu kho ở server (vertical slice)

**Trước:** FE tải **toàn bộ** `GET /inventory/docs` (kèm `lines`) rồi tự lọc/sort/phân trang ở client (`applyView`).
**Sau:** server làm tất cả, FE chỉ hiển thị.

| Tầng | Việc đã làm |
| :--- | :--- |
| **DB** | Không đổi schema (dùng index sẵn có `idx_inv_doc_type_date`, `idx_inv_doc_date`) |
| **BE** | `InvDocResource.list(q,type,dateFrom,dateTo,page,pageSize,sort,dir)` → `Map.of("items",…,"total",…)`; whitelist `SORTABLE` (`no/type/partner/date`); `orderBy()` mặc định `id DESC`; `parseDate()` ⇒ 400 thay vì 500; `pageSize` chặn `[1,100]`; không tham số ⇒ tối đa 10.000 dòng |
| **BE security** | `@Authenticated` ở class; `@RolesAllowed("admin")` cho `DELETE` + `bulk-delete`; `bulk-delete` chặn rỗng & `> 500` id |
| **FE API** | `inventoryApi.list(params)` + `toQS()` (bỏ tham số rỗng); **xoá bản trùng** `core/inventoryApi.js` |
| **FE store** | `st{docs,total,loading,error}` + `lastQuery`; `load(params)`; `resetDocs()` đăng ký qua `registerReset`; sau ghi/xoá ⇒ `load()` để `total`/trang khớp server |
| **FE UI** | `ListView` query server + **debounce 300ms**; `items = docs` (server đã cắt trang); đếm dòng/phân trang theo `total` server; chọn dòng **theo trang**; bỏ nút "Chọn tất cả {n}" |
| **FE Global Search** | `search(q)` gọi API (`page=1&pageSize=20`) ⇒ tìm được cả phiếu ngoài trang đang xem; lỗi ⇒ trả `[]` để không vỡ khung search |
| **FE lifecycle** | Bỏ `setup(){ load(); }` ⇒ dữ liệu chỉ tải khi đã đăng nhập; `configureHttp({onUnauthorized})` ⇒ 401 từ `http.js` tự đăng xuất; `resetAllStores()` khi `clearSession` |
| **FE shared** | Hook mới `core/useDebounced.js`; `catalog` chuyển sang dùng chung (hết copy-paste) |
| **i18n** | Thêm `inv.loadFailed`, `inv.saveFailed`, `inv.deleteFailed` (vi+en) — 3 key trước đây **được gọi nhưng chưa khai báo**; bỏ key thừa `inv.selectAllResults` |

### 1.3 Dữ liệu mẫu `V00006__document_data.sql`

| Nội dung | Chi tiết |
| :--- | :--- |
| Phiếu | **9**: `PN0001–PN0003` (nhập/NCC), `PX0001–PX0003` (xuất/KH), `PT0001–PT0003` (trả/KH) |
| Dòng hàng | **17** (2–3 dòng/phiếu), tổng **457.435.000 đ** |
| Ngày | `CURRENT_DATE - {35,28,21,18,12,7,5,3,1}` ⇒ bộ lọc `dateFrom/dateTo` luôn có dữ liệu |
| Ngân hàng | Đan xen có/không (VCB, TCB, BIDV, `NULL`) |
| Kỹ thuật | Tham chiếu master theo **`code`** (vì `V00004` dùng `gen_random_uuid()`); mọi `INSERT` có `WHERE NOT EXISTS`; số phiếu **liên tục từ 0001** (do `count+1`); đồng bộ `inv_doc_counter.last_no`; khối `DO $$ … RAISE WARNING/NOTICE` |

### 1.4 Kiểm chứng đã chạy (bằng chứng)

| Kiểm chứng | Cách làm | Kết quả |
| :--- | :--- | :--- |
| Backend compile | `JAVA_HOME=~/.sdkman/candidates/java/21.0.12+1.1-tem ./mvnw -o -q compile` | ✅ `EXIT=0` |
| Frontend build | `./node_modules/.bin/vite build --outDir /tmp/vite-check --emptyOutDir` (2 lần) | ✅ 60 modules, exit 0 |
| Không ghi rác vào repo | build đổ ra `/tmp`; kiểm tra `src/main/webui/dist` | ✅ timestamp không đổi |
| Migration thật | container Postgres 15 tạm (port **55433**) + chạy V00001→V00006 | ✅ `ALL_MIGRATIONS_OK`, `9 phiếu, 17 dòng` |
| Dữ liệu | query đối chiếu số phiếu/loại, `pos`, counter, FK mồ côi | ✅ liên tục `0001..0003`/loại · `pos` = `0..n-1` · counter 3/3/3 · 0 mồ côi |
| Idempotency | chạy lại V00006 trên DB đã seed | ✅ vẫn 9/17, không trùng, không lỗi UNIQUE |
| Dọn dẹp | `docker rm -f ketoan-seedtest` | ✅ container đã xoá (không đụng `postgres_db` của bạn) |
| Code chết | grep `applyView`/`SORT_GET`/`setup(){ load` | ✅ chỉ còn trong 2 file backup `index copy*.jsx` (cố ý không chạm) |

---

## 2. FILES MODIFIED — DANH SÁCH FILE

### 2.1 Tạo mới

| File | Dòng/KB | Mục đích |
| :--- | :--- | :--- |
| `PROJECT_GUIDE.md` (root) | 871 dòng | Tài liệu kiến trúc chuẩn của dự án (nguồn sự thật về hiện trạng) |
| `.ai/RULES.md` | ~606 dòng / 55 KB | Quy tắc phát triển có Rule ID (BE/FE/CS) — **đọc trước khi code** |
| `.ai/modules/auth-agent.md` | 252 dòng | Module xác thực (JWT cookie) |
| `.ai/modules/catalog-agent.md` | 323 dòng | Module danh mục (6 danh mục) |
| `.ai/modules/inventory-agent.md` | ~300 dòng | Module kho (bản đồ file + checklist + rủi ro) |
| `.ai/modules/admin-agent.md` | 249 dòng | Module phân quyền (thuần FE, localStorage) |
| `.ai/modules/inventory-architect.md` | ~1.470 dòng | Phân tích kiến trúc sâu module kho (10 mục + 12 pattern) |
| `.ai/SESSION.md` | (file này) | Nhật ký phiên làm việc |
| `src/main/webui/src/core/useDebounced.js` | 17 dòng | Hook debounce dùng chung cho `catalog` + `inventory` |
| `src/main/resources/db/migration/V00006__document_data.sql` | 216 dòng | Dữ liệu mẫu phiếu kho (idempotent) |

### 2.2 Sửa đổi (code)

| File | Thay đổi chính |
| :--- | :--- |
| `src/main/java/com/ketoan/resource/InvDocResource.java` | `@Authenticated`; `list()` có search/filter/sort/paging → `{items,total}`; whitelist `SORTABLE`; `orderBy()`, `parseDate()`; `@RolesAllowed("admin")` + giới hạn `bulk-delete`; bỏ `Sort`/`listAll` |
| `src/main/webui/src/api/inventoryApi.js` | `list(params)` + `toQS()` |
| `src/main/webui/src/plugins/inventory/index.jsx` | Store (`total`, `lastQuery`, `load(params)`, `resetDocs`); `ListView` server-side + debounce; `search()` gọi API; xoá `SORT_GET`/`applyView`; bỏ `setup()`; +3 key i18n, −1 key thừa; cột "Tổng cộng" không sort (TODO) |
| `src/main/webui/src/plugins/catalog/index.jsx` | Dùng `useDebounced` từ `core/` (bỏ bản copy) |
| `src/main/webui/src/core/auth.jsx` | `configureHttp({onUnauthorized})`; `resetAllStores()` trong `clearSession` |
| `src/main/webui/src/core/masterdata.js` | `registerReset(fn)`; `resetAllStores()` gọi thêm resetter đã đăng ký |

### 2.3 Sửa đổi (tài liệu)

| File | Thay đổi |
| :--- | :--- |
| `.ai/PROJECT_GUIDE.md` | Viết lại toàn bộ (bản cũ sai stack) → digest trỏ về `PROJECT_GUIDE.md` |
| `.ai/modules/inventory-agent.md` | Cập nhật §1/§2/§3/§4/§7/§9 theo feature + V00006; sửa dòng còn ghi "KHÔNG có `@Authenticated`" |
| `.ai/modules/inventory-architect.md` | Thêm khối "THAY ĐỔI ĐÃ TRIỂN KHAI"; sửa §5.1 (E1), §9.1 (S-1/S-2), §10.3 (bước 1 xong) |
| `.ai/RULES.md` | Cập nhật §0.3/§2.3/§6 (`src/api/inventoryApi.js`); đánh dấu ✅ 4 mục nợ đã sửa |
| `CHANGELOG.md` | Thêm 2 mục: `[Dữ liệu mẫu Phiếu kho]`, `[Tính năng Tìm kiếm Phiếu Kho]` |
| `COMPONENT_MAPPING.md` | §3.4 `InvDocResource` (search + roles); §6 bảng migrations (+V00006, sửa ghi chú lỗi thời V00005) |
| `PROJECT_STATUS.md` | Dòng phân hệ Kho (85%, search server-side, V00006); §4 next steps (việc #1 ✅, thêm 4 việc Kho) |

### 2.4 Đã xoá

| File | Lý do |
| :--- | :--- |
| `src/main/webui/src/core/inventoryApi.js` | Bản trùng của `src/api/inventoryApi.js` (RULES **FE-ST8**, guide §7.2 #13) |

---

## 3. DESIGN DECISIONS — QUYẾT ĐỊNH THIẾT KẾ

| # | Quyết định | Lý do / đánh đổi | Rule |
| :- | :--- | :--- | :--- |
| D1 | Tài liệu **mô tả đúng hiện trạng**, sửa lại hiểu nhầm Spring Boot/Repository/MapStruct/Axios/React Router | Prompt cũ `.ai/prompts/*` ghi sai stack ⇒ AI sẽ sinh code không compile được | — |
| D2 | Chuẩn hoá quy tắc thành **Rule ID** (`BE-R7`, `FE-ST8`, `CS-S1`…) | Trích dẫn được khi review/commit, kiểm tra được theo checklist | — |
| D3 | Search **theo hợp đồng `MasterResource`** (`{items,total}` + `q/page/pageSize/sort/dir`) thay vì tự đặt API riêng | FE đã có sẵn pattern (`catalog`), store `createstore` đã xử lý `{items,total}`; giảm khái niệm mới | BE-R7, FE-ST3 |
| D4 | Giữ `lines` trong payload danh sách (chưa tách DTO) | Đổi tối thiểu: `FormView` + cột "Tổng cộng" + Global Search vẫn chạy nguyên; N+1 chỉ trong 1 trang ≤100 ⇒ chấp nhận tạm, ghi TODO | BE-P10 (SHOULD) |
| D5 | Sort whitelist chỉ `no/type/partner/date`; cột **"Tổng cộng" tạm không sort** | Sort theo tổng cần `ORDER BY (sum …)` hoặc cột `grand_total`; không dám dùng subquery ORDER BY khi chưa test runtime | BE-R12, CS-N |
| D6 | **Gộp vá bảo mật** vào cùng thay đổi (`@Authenticated`, `@RolesAllowed`, bỏ `setup(){load}`, 401 handler) | RULES **CS-S1/CS-S2** yêu cầu khi chạm module Kho; nếu chỉ thêm `@Authenticated` mà giữ `setup()` sẽ có request 401 lúc boot | CS-S1/S2/S4, FE-AP12 |
| D7 | **Một nguồn API** `src/api/inventoryApi.js`; xoá bản `core/` | Sửa 1 file thay vì 2; đúng CS-N/FE-ST8; rủi ro thấp (chỉ 1 import site) | FE-ST8 |
| D8 | Trích `useDebounced` ra `core/` và **cập nhật luôn `catalog`** | Nếu chỉ copy vào inventory sẽ tạo bản trùng thứ 2 (đúng nợ đang muốn xoá); thay đổi ở catalog rất nhỏ | FE-PL16, CS-R4 |
| D9 | `store.load()` **tải lại sau mỗi thao tác ghi** | `total`/trang do server quyết định; tránh cache lệch; đổi lại tốn 1 request/lần ghi | FE-ST5 |
| D10 | Chọn nhiều = **theo trang hiện tại**; bỏ nút "Chọn tất cả {n}" | Không thể chọn đúng toàn bộ kết quả khi đã phân trang server (nếu giữ sẽ là nút "dối") | FE-PL12, CS-S14 |
| D11 | Dữ liệu mẫu **idempotent** (`WHERE NOT EXISTS`) + **số phiếu liên tục** | Migration fail ⇒ app không khởi động; `count+1` cần dãy số liền mạch | BE-F2/F9, BE-P9 |
| D12 | Đặt tên `V00006__document_data.sql` (không phải `v0006__document-data.sql`) | Theo BE-F1 + 5 file cũ (`V00005__document.sql`); Flyway chỉ đọc version nên đổi tên không ảnh hưởng nội dung | BE-F1 |
| D13 | Seed dùng `CURRENT_DATE - n` thay vì ngày cố định | Bộ lọc `dateFrom/dateTo` luôn có dữ liệu ở mọi thời điểm chạy | — |

---

## 4. KNOWN ISSUES — VẤN ĐỀ CÒN TỒN TẠI

> Mức: 🔴 P0 (sai/bảo mật) · 🟠 P1 (dễ gây lỗi khi sửa) · 🟡 P2 (chất lượng). Danh sách 38 mục đầy đủ: `PROJECT_GUIDE.md` §7.

### 4.1 Do feature này **chưa làm** (đã ghi TODO)

| # | Vấn đề | Mức | Vị trí | Ảnh hưởng |
| :- | :--- | :--- | :--- | :--- |
| N1 | `create/update` **không validate** ở server (thiếu `partner`, `qty ≤ 0`, `price < 0`, `note` > 1000) | 🔴 | `InvDocResource.create/update` | Dữ liệu sai ⇒ `500` (DB constraint) thay vì `400 {"message"}` |
| N2 | Sinh số phiếu bằng `count(*)+1` (race + **tái sử dụng số** sau khi xoá) | 🔴 | `InvDocResource.create` | 2 người lưu đồng thời ⇒ 1 người nhận 500; số chứng từ bị trùng nghĩa |
| N3 | `PUT` **xoá & tạo lại toàn bộ lines** | 🟠 | `InvDocResource.update` | id dòng bị “churn”, mất dấu vết nội dung cũ (không audit) |
| N4 | Payload list **kèm `lines`** ⇒ N+1 (`1 + pageSize` query) | 🟠 | `InvDocResource.list` | Với pageSize=100 ⇒ 101 query/lần tải |
| N5 | Cột **"Tổng cộng" không sort được** (server chưa có `grand_total`) | 🟡 | `plugins/inventory/index.jsx` (`sortable:false` + TODO) | Giảm 1 khả năng so với trước (đã ghi trong CHANGELOG) |
| N6 | Không có “chọn tất cả kết quả” cho bulk delete (chỉ theo trang) | 🟡 | `ListView` | Xoá nhiều trang phải lặp lại từng trang (an toàn hơn, nhưng bất tiện) |
| N7 | **Chưa có test** cho search (401/400/403/paging) | 🟠 | `src/test/java` | Không có lưới an toàn khi refactor; `pom.xml` đang `skipTests=true` |

### 4.2 Nợ **có sẵn từ trước** (chưa xử lý trong phiên này)

| # | Vấn đề | Mức | Ghi chú |
| :- | :--- | :--- | :--- |
| N8 | Ghi **danh mục** không phân quyền server-side (chỉ `@Authenticated`) | 🔴 P0 #2 | `user` thường vẫn sửa/xoá được 6 danh mục qua API |
| N9 | `/auth/register` trả entity `User` (kèm hash mật khẩu); `/auth/login` trả UUID không phải JWT | 🔴 P0 #3/#4 | Endpoint public, gây hiểu nhầm |
| N10 | `SecurityFilter` in log mỗi request, chỉ kiểm cookie tồn tại | 🟠 P0 #5 | Nhiễu log + cảm giác an toàn giả |
| N11 | Cookie `secure=false` | 🟠 P0 #6 | Phải bật khi chạy HTTPS |
| N12 | `InvLine.qty/price` là `long` nhưng DB `numeric(18,3)/(18,2)` | 🟠 P0 #9 | Mất phần thập phân |
| N13 | Phân quyền chỉ ở `localStorage` (không có bảng DB) | 🟠 P2 #32 | Không phải bảo mật; mất khi xoá cache |
| N14 | 8 file backup (`*copy*.jsx`, `router copy 2.js`, `router-3.js`) vẫn còn | 🟠 P1 #12 | Gây nhiễu grep; **chứa code cũ** (`applyView`, `setup(){load}`) nên dễ sửa nhầm |
| N15 | `quarkus-qute` khai 2 lần + `commons-dbutils` không dùng; `model/User.java` chết | 🟠 P1 #14/#15 | Nợ dependency/code chết |
| N16 | Test cũ `DanhMucTaiKhoanResourceTest` gọi `/danhmuc` (không tồn tại) | 🟠 P2 #27 | Luôn fail nếu bật test |
| N17 | `Dockerfile` copy `target/quarkus-app/` nhưng pom đặt `package.type=uber-jar` | 🟠 P2 #28 | Build/deploy lệch |
| N18 | `cookies.txt` chưa bị `.gitignore`; repo không có file compose | 🟡 P1 #25/#26 | Rác repo / README thiếu lệnh chạy được |
| N19 | `state.editing` (cả phiếu + mảng lines) nằm trong **URL hash** | 🟡 S1 (architect §7.4) | URL dài khi phiếu nhiều dòng |
| N20 | `webui-v1` (React 19 + Fluent UI) tồn tại song song, Quinoa không build | 🟡 P1 #24 | Dễ nhầm lẫn, tốn dung lượng |
| N21 | `.ai/prompts/{05,06,08}` vẫn ghi “Spring Boot/Repository/MapStruct” | 🟠 | Đã cảnh báo ở đầu `RULES.md` nhưng **chưa sửa prompt** |
| N22 | `COMPONENT_MAPPING.md` §2.2 vẫn mô tả inventory dùng `fakeApi`/`SEED_DOCS` | 🟡 | Chỉ đã sửa §3.4/§6 |
| N23 | **Rủi ro runtime chưa kiểm chứng:** JPQL dùng `d.partner.name` (embedded) chưa chạy qua Hibernate thật | 🟢 ✅ | **ĐÃ ĐÓNG 17/10/2026** — `GET/POST/PUT/DELETE /api/inventory/docs` đã chạy end-to-end trên app thật + Postgres 15 (§10.4). Riêng `GET /docs/{id}` vẫn **405** (xem §10.6) |

---

## 5. PENDING TASKS — VIỆC CÒN LẠI

### 5.1 Chặn chất lượng (nên làm ngay)

- [x] **Chạy app thật 1 lần** để xác thực `GET /api/inventory/docs` qua Hibernate (JPQL `d.partner.name`, sort, paging) — lệnh ở §7. ✅ **ĐÃ XONG 17/10/2026** (port 8099 + DB tạm 55436, xem §10.4); phát hiện & sửa luôn lỗi `doc_id` NULL.
- [ ] **Test tích hợp** `InvDocResource`: `401` (không cookie), `403` (user thường xoá), `400` (type/ngày sai), phân trang + search; bỏ `skipTests=true`.
- [ ] Test FE cho logic thuần: `buildQuery`, `parseDate`, `parseNum`, `norm`, `lineTotal` (tách `plugins/inventory/logic.js` nếu cần).

### 5.2 Hoàn thiện module Kho

- [ ] Validate server `create/update` + `flushOrConflict` ⇒ 400/409 (N1).
- [ ] Sinh số phiếu bằng `inv_doc_counter` — **counter đã được seed đúng = 3**, chỉ cần đổi code (`.ai/modules/inventory-architect.md` §10.2).
- [ ] Thêm cột `grand_total` (hoặc bảng tổng hợp) + duy trì khi ghi ⇒ khôi phục sort theo "Tổng cộng" (N5).
- [ ] DTO tách list/detail (list không kèm `lines`, có `grandTotal`) ⇒ hết N+1 (N4).
- [ ] `BigDecimal` cho `qty/price` (N12) + tính tổng ở server.
- [ ] Audit/soft-delete chứng từ (`status`, `deleted_at`, `created_by/updated_by`, bảng history) — §10.10.
- [ ] `@Version` (optimistic locking) chống ghi đè khi 2 người sửa cùng phiếu — §10.8.

### 5.3 Dọn nợ & bảo mật còn lại

- [ ] Xoá 8 file backup; xoá `quarkus-qute` (×2), `commons-dbutils`, `model/User.java`.
- [ ] `@RolesAllowed("admin")` cho ghi danh mục; chuyển ma trận quyền xuống DB; `/auth/register` trả DTO; bỏ `/auth/login` chết; dọn `SecurityFilter`.
- [ ] Cookie `secure(true)` theo profile `%prod`.
- [ ] `cookies.txt` vào `.gitignore`; bổ sung `compose.yaml`.
- [ ] Sửa `Dockerfile` cho khớp kiểu đóng gói (hoặc bỏ `uber-jar`).
- [ ] Cập nhật `.ai/prompts/{05,06,08}` sang Quarkus; cập nhật `COMPONENT_MAPPING.md` §2.2.
- [ ] Quyết định số phận `webui-v1` (archive/xoá).

### 5.4 Kiểm thử tay (UI) sau feature

- [ ] Gõ ô tìm kiếm → **1 request** có `q=` (Network), debounce ~300ms (không gọi mỗi phím).
- [ ] Đổi loại phiếu (Menu) / khoảng ngày → `type=`, `dateFrom=`, `dateTo=` xuất hiện, `total` đổi.
- [ ] Bấm tiêu đề `no/type/partner/date` → `sort=` + `dir=`; cột "Tổng cộng" **không** có nút.
- [ ] Đổi `pageSize`, đi trang cuối, xoá phiếu cuối ⇒ trang tự lùi.
- [ ] Chọn vài dòng → xoá (admin) ⇒ danh sách + `total` cập nhật.
- [ ] Tạo/sửa phiếu ⇒ về danh sách thấy đúng trang, `total` thay đổi.
- [ ] Global Search gõ `PN00` ⇒ có kết quả **cả phiếu ngoài trang hiện tại**; bấm ⇒ mở đúng phiếu.
- [ ] Đăng xuất rồi đăng nhập user khác ⇒ **không** thấy dữ liệu cũ (reset store hoạt động).

---

## 6. SUGGESTED NEXT STEPS — ĐỀ XUẤT BƯỚC TIẾP THEO

| Ưu tiên | Việc | Lý do | Công sức |
| :---: | :--- | :--- | :--- |
| **1** | Chạy app + gọi API thật (curl có cookie) để xác thực JPQL/paging | Đây là **điểm chưa kiểm chứng duy nhất** của feature (N23) | ~10 phút |
| **2** | Thêm 5 test tích hợp + bỏ `skipTests` | Khoá hành vi vừa làm; tránh hồi quy khi refactor tiếp | ~1–2 giờ |
| **3** | Validate `create/update` + `flushOrConflict` (N1) | Chặn 500 ⇒ 400/409; P0 còn lại của module | ~1 giờ |
| **4** | Chuyển sinh số phiếu sang `inv_doc_counter` (N2) | Counter **đã đúng** sau V00006 ⇒ sửa ~3 dòng; hết race + hết tái sử dụng số | ~30 phút |
| **5** | `grand_total` + khôi phục sort cột "Tổng cộng" (N5) | Trả lại khả năng đã có; mở đường cho DTO nhẹ | ~2 giờ |
| **6** | DTO list/detail + `BigDecimal` (N4/N12) | Hiệu năng + độ chính xác tiền tệ | ~3 giờ |
| **7** | Dọn nợ P1 (backup files, pom deps, cookies.txt, Dockerfile) | Giảm nhiễu, tránh sửa nhầm; rủi ro thấp | ~1 giờ |
| **8** | Phân quyền xuống DB + `@RolesAllowed` cho danh mục (N8/N13) | Bịt P0 #2 và biến ma trận quyền thành thật | ~1 ngày |

---

## 7. CÁCH CHẠY & KIỂM THỬ NHANH

```bash
# 0) Chuẩn bị (chỉ lần đầu)
#    src/main/resources/*pem-sample   -> *.pem
#    src/main/webui/.env.local-sample -> .env.local   (VITE_USE_REAL_API=true)

# 1) Dev mode (Quinoa tự chạy Vite; Flyway tự áp V00006)
./mvnw compile quarkus:dev

# 2) Seed lại DB từ đầu (xoá sạch rồi migrate + seed)
quarkus_flyway_clean_at_start=true ./mvnw clean compile quarkus:dev

# 3) Kiểm tra endpoint (BẮT BUỘC đăng nhập vì đã thêm @Authenticated)
curl -c /tmp/c.txt -X POST localhost:8080/api/auth/loginv1 \
     -H 'Content-Type: application/json' -d '{"username":"admin","password":"123"}'

curl -b /tmp/c.txt 'localhost:8080/api/inventory/docs?q=thép&page=1&pageSize=5'
curl -b /tmp/c.txt 'localhost:8080/api/inventory/docs?type=export&dateFrom=2026-09-01&sort=date&dir=desc'
curl -b /tmp/c.txt 'localhost:8080/api/inventory/docs?type=sai'    # mong đợi 400 {"message":...}
curl            'localhost:8080/api/inventory/docs'               # mong đợi 401

# 4) Build kiểm tra (không cần DB)
./mvnw -o -q compile
cd src/main/webui && ./node_modules/.bin/vite build --outDir /tmp/vite-check --emptyOutDir
```

---

## 8. GHI CHÚ BÀN GIAO (cho phiên/agent tiếp theo)

**Đọc theo thứ tự này trước khi sửa bất cứ thứ gì:**

1. `.ai/RULES.md` — đặc biệt §0 (KHÔNG Spring Boot), §1.1 (Resource), §2.1–2.4 (plugin/store/API/quyền), §3.2 (security), §5 (nợ đã biết).
2. `PROJECT_GUIDE.md` §2.6 (luồng InvDoc), §3.4 (store), §7 (38 khuyến nghị).
3. Module liên quan: `.ai/modules/inventory-agent.md` (bản đồ file) → `.ai/modules/inventory-architect.md` (kiến trúc sâu; đọc khối **"THAY ĐỔI ĐÃ TRIỂN KHAI"** ở đầu file trước).
4. Chỉ đọc đúng nhóm file theo bảng `RULES.md` §0.3 — **không quét cả cây**.

**MUST NOT (đã từng gây lỗi / đang là bẫy):**

- ❌ Sửa 8 file backup `*copy*.jsx`, `router copy 2.js`, `router-3.js` — chúng chứa code **cũ** (`applyView`, `setup(){load}`) và sẽ làm bạn tưởng feature chưa làm.
- ❌ Gỡ `@Authenticated` / `@RolesAllowed("admin")` của `InvDocResource`.
- ❌ Thêm lại `setup(){ load(); }` cho plugin kho (sẽ gọi API trước khi đăng nhập).
- ❌ Sửa `V00001–V00006` (Flyway checksum ⇒ app không khởi động). Mọi thay đổi schema = `V00007__*.sql`.
- ❌ Dùng `fetch` trong component / tạo client API thứ ba / tạo lại `core/inventoryApi.js`.
- ❌ Đặt `title` plugin là chuỗi hiển thị (phải là **key i18n**), hoặc thêm chuỗi chỉ có `vi`.
- ❌ Trả `{"error":…}` cho endpoint mới (dùng `{"message":…}`); ném 500 cho lỗi validate.
- ❌ Đổi `type`/`no` của phiếu qua `PUT` (đang **cố ý bất biến**).

**Nếu cần hoàn tác feature này:** chỉ xoá `V00006__document_data.sql` khi DB **chưa** áp; nếu đã áp, xoá file sẽ làm Flyway báo *"applied migration missing"* ⇒ phải `flyway repair`/clean. Phần code: hoàn nguyên `InvDocResource.list()` về `listAll`, FE khôi phục `applyView` (có trong `index copy 2.jsx`) — **không khuyến khích**, vì sẽ mất các P0 fix.

---

## 9. NHẬT KÝ THỜI GIAN (tóm tắt)

| Bước | Nội dung | Kết quả |
| :--- | :--- | :--- |
| 1 | Đọc `.ai/prompts/01-analyze-project.md`, quét BE + FE, xác định stack thật | → `PROJECT_GUIDE.md`, `.ai/PROJECT_GUIDE.md` |
| 2 | Viết 4 tài liệu module (9 mục/ file) | `.ai/modules/*-agent.md` |
| 3 | Phân tích sâu + 10 mục + 12 pattern cho kho | `.ai/modules/inventory-architect.md` |
| 4 | Chuẩn hoá quy tắc theo Rule ID | `.ai/RULES.md` |
| 5 | Implement search server-side + P0 fixes + dedupe API + i18n | 6 file code sửa, 1 file xoá, 1 file mới |
| 6 | Seed dữ liệu mẫu + kiểm chứng Postgres thật + idempotency | `V00006__document_data.sql` |
| 7 | Cập nhật docs (CHANGELOG, COMPONENT_MAPPING, PROJECT_STATUS, module docs, RULES) | 7 file tài liệu |
| 8 | Build/compile xác nhận + dọn container/temp | ✅ BE compile, FE build, DB test |

---

## 10. PHIÊN 2 — 17/10/2026 · DEBUG + FIX A (`doc_id` NOT NULL)

> **Yêu cầu phiên:** (1) điều tra lỗi khi lưu phiếu kho — **chỉ điều tra, không sửa code**; (2) sau khi có báo cáo ⇒ **implement đúng Fix A**, không làm Fix B, không refactor ngoài phạm vi.
> **Sản phẩm:** [`../DEBUG_REPORT.md`](../DEBUG_REPORT.md) (§1–§11) · [`../IMPLEMENTATION_REPORT.md`](../IMPLEMENTATION_REPORT.md) (§1–§11) · [`../BEFORE_AFTER.md`](../BEFORE_AFTER.md) (§1–§9)

### 10.1 Triệu chứng (đã tái hiện thật, không suy đoán)

| | |
| :--- | :--- |
| **Lỗi** | `ERROR: null value in column "doc_id" of relation "inv_doc_line" violates not-null constraint` |
| **Xảy ra khi** | `POST /api/inventory/docs` (tạo) **và** `PUT /api/inventory/docs/{id}` (sửa) ⇒ **HTTP 500** |
| **Không xảy ra khi** | `GET` danh sách / xoá phiếu ⇒ dữ liệu cũ **nguyên vẹn** (transaction rollback) |
| **Môi trường tái hiện** | Quarkus dev **port 8081** + container `postgres:15` tạm **port 55435**, auth `admin/123` ⇒ cookie `token` |

### 10.2 Root cause (một câu)

`InvDoc.lines` là `@OneToMany(cascade = ALL, orphanRemoval = true)` **một chiều** + `@JoinColumn(name = "doc_id")` + `@OrderColumn(name = "pos")`, trong khi `InvLine` **không map** `doc_id`/`pos` ⇒ Hibernate coi **collection là bên sở hữu khoá ngoại** ⇒ `INSERT inv_doc_line` **thiếu** 2 cột rồi mới `UPDATE` bù; cột `NOT NULL` ⇒ câu INSERT **đầu tiên** đã vi phạm.

**Bằng chứng vàng** (nằm trong message exception):
`insert into inv_doc_line (price, product_id, product_name, qty) values (?,?,?,?)` — thiếu `doc_id` + `pos`.

### 10.3 Thay đổi — 3 file Java, **không migration**

| # | File | Thay đổi |
| :- | :--- | :--- |
| 1 | `src/main/java/com/ketoan/entity/InvDoc.java` | `@OneToMany(mappedBy = "doc", cascade = ALL, orphanRemoval = true)` + `@OrderBy("pos asc")`; **bỏ** `@JoinColumn` + `@OrderColumn` |
| 2 | `src/main/java/com/ketoan/entity/InvLine.java` | Thêm `@ManyToOne(fetch = LAZY, optional = false) @JoinColumn(name="doc_id", nullable=false) @JsonIgnore public InvDoc doc;` và `public int pos;` (+4 import) |
| 3 | `src/main/java/com/ketoan/resource/InvDocResource.java` | Helper `linkLines(doc, lines)` (gán `id=null`, `doc`, `pos=i`, đồng bộ 2 chiều) dùng ở `create()`/`update()`; `em.flush()` ngay sau `d.lines.clear()` |

**Không đổi:** `V00001–V00006`, endpoint/route, response shape (chỉ **thêm** `lines[].pos`), nghiệp vụ “lưu = thay thế toàn bộ dòng”, `count+1` sinh số phiếu, FE.

### 10.4 Kiểm chứng đã chạy (bằng chứng)

| # | Kiểm chứng | Kết quả |
| :- | :--- | :--- |
| 1 | `./mvnw -o -q compile` (2 lần: sau Fix A và sau khi thêm `em.flush`) | ✅ `EXIT=0`, không warning mới |
| 2 | App thật `quarkus:dev` **port 8099** + DB tạm **port 55436**, Flyway áp `V00001…V00006` | ✅ khởi động OK |
| 3 | `POST /api/auth/loginv1` (admin/123) | ✅ `200` + cookie |
| 4 | `POST /docs` 3 dòng A,B,C | ✅ **201**, `id=11`, `no=PN0004`, lines id 22/23/24 `pos 0/1/2` |
| 5 | DB sau CREATE: `doc_id` có giá trị, `pos 0,1,2`; `count(*) where doc_id is null` | ✅ đúng · **0 dòng NULL** |
| 6 | `GET /docs?q=PN0004` | ✅ thứ tự `A → B → C` |
| 7 | `PUT /docs/11` đảo thành C,A,B | ✅ **200**, lines mới id 25/26/27, `pos 0/1/2` |
| 8 | `DELETE /docs/11` | ✅ **204**, cascade xoá dòng (`lines_left=0`) |
| 9 | SQL log (`log_statement='all'` trên container tạm) | ✅ **1 INSERT/dòng** có `doc_id` + `pos`; PUT: `delete …` ×n **trước** rồi `insert …` ×n; **không còn** `update inv_doc_line set doc_id=…` |
| 10 | Dọn dẹp | ✅ dừng app, `docker rm -f ketoan-fixdb` (không đụng DB/app dev của bạn) |

### 10.5 Sự cố phát sinh trong lúc implement (đã xử lý)

| Hiện tượng | Nguyên nhân | Xử lý |
| :--- | :--- | :--- |
| `PUT` ⇒ 500 `Key (doc_id, pos)=(11, 0) already exists` | Với `mappedBy` + `orphanRemoval`, Hibernate chèn dòng mới **trước** khi xoá dòng cũ trong cùng flush ⇒ trùng `UNIQUE(doc_id,pos)` | Thêm `em.flush()` ngay sau `d.lines.clear()` ⇒ DELETE chạy trước, INSERT sau. Test lại: 200, DB đúng |

### 10.6 Nợ đã đóng / nợ còn lại sau phiên 2

| | Vấn đề | Trạng thái |
| :--- | :--- | :--- |
| ✅ | **N23** — JPQL/paging runtime chưa kiểm chứng | **Đã đóng** (`GET/POST/PUT/DELETE` chạy thật) |
| ✅ | Lỗi `doc_id` NULL (chặn hoàn toàn chức năng lưu phiếu) | **Đã sửa** (Fix A) |
| 🟠 | **`.ai/RULES.md` BE-E9** đang **dạy đúng pattern gây bug** (`@OneToMany + @JoinColumn + @OrderColumn` một chiều) | **Chưa sửa — ưu tiên 1** của phiên sau |
| 🟠 | `.ai/modules/inventory-agent.md` §2/§3, `inventory-architect.md` §4 chưa mô tả mapping 2 chiều / 1 INSERT mỗi dòng | Chưa cập nhật |
| 🟡 | `lines[].lineTotal` trả `null` ngay sau POST/PUT (cột generated chưa refresh) | Có sẵn từ trước; FE tự tính `qty*price` |
| 🟡 | `GET /api/inventory/docs/{id}` vẫn **405** (Resource không có method GET theo id) | Có sẵn (`DEBUG_REPORT` §11.1) |
| 🟠 | Hibernate log 2 **ERROR schema validation**: `price`/`qty` `numeric` ↔ `long` | Nợ **P0 #9** (N12) — sửa bằng `BigDecimal` |
| 🟠 | Sinh số phiếu bằng `count(*)+1` | Nợ **N2** (counter `inv_doc_counter` đã sẵn sàng) |
| ⚠️ | `CHANGELOG.md` / `PROJECT_STATUS.md` **chưa có mục Fix A** | Chưa cập nhật |

---

## 11. BÀN GIAO — VIỆC TIẾP THEO & PROMPT MỞ TASK MỚI

### 11.1 Ưu tiên (đề xuất, chưa làm)

| Ưu tiên | Việc | Lý do | Công sức |
| :---: | :--- | :--- | :--- |
| **1** | **Đồng bộ tài liệu sau Fix A**: sửa `.ai/RULES.md` **BE-E9** → mapping 2 chiều (`@ManyToOne @JoinColumn` ở con + `@OneToMany(mappedBy)` + `@OrderBy` + field `pos`); cập nhật `modules/inventory-agent.md` §2/§3, `modules/inventory-architect.md` §4 (1 INSERT/dòng); thêm mục `[Fix doc_id NULL] - 2026-10-17` vào `CHANGELOG.md`, cập nhật `PROJECT_STATUS.md` | BE-E9 đang **dạy pattern gây bug** ⇒ phiên sau rất dễ tái tạo lỗi | ~30–45 phút |
| **2** | **Test tích hợp `@QuarkusTest`**: POST 1/nhiều dòng, PUT đảo thứ tự 2 lần liên tiếp, DELETE cascade, case lỗi; bỏ `skipTests=true` | Khoá hành vi vừa fix (hiện **0%** test cho module Kho) | ~1–2 giờ |
| **3** | `BigDecimal` cho `InvLine.qty/price` + validate `create/update` (`flushOrConflict` ⇒ 400/409) | Hết 2 ERROR schema validation (P0 #9); chặn 500 ⇒ 400 | ~1,5 giờ |
| **4** | Sinh số phiếu bằng `inv_doc_counter` (N2) | Counter đã seed đúng; hết race + hết tái sử dụng số | ~30 phút |
| **5** | `grand_total` (V00007) + khôi phục sort cột “Tổng cộng” (N5); DTO list/detail (N4) | Hiệu năng + trả lại khả năng đã mất | ~2–3 giờ |
| **6** | `GET /api/inventory/docs/{id}` (đang 405) | FE deep-link/mở phiếu ngoài danh sách | ~20 phút |
| **7** | Dọn nợ P1: 8 file backup, `quarkus-qute` ×2, `cookies.txt` vào `.gitignore`, `Dockerfile` lệch `uber-jar` | Giảm nhiễu, tránh sửa nhầm | ~1 giờ |

### 11.2 Cách chạy lại để kiểm chứng Fix A (không đụng DB dev)

```bash
export JAVA_HOME=~/.sdkman/candidates/java/21.0.12+1.1-tem
docker run -d --name ketoan-fixdb -e POSTGRES_PASSWORD=secret -e POSTGRES_USER=laravel \
           -e POSTGRES_DB=ke_toan -p 55436:5432 postgres:15
./mvnw -o quarkus:dev -Dquarkus.http.port=8099 \
       -Dquarkus.datasource.jdbc.url=jdbc:postgresql://localhost:55436/ke_toan

curl -c /tmp/c.txt -X POST localhost:8099/api/auth/loginv1 \
     -H 'Content-Type: application/json' -d '{"username":"admin","password":"123"}'
curl -b /tmp/c.txt "localhost:8099/api/materials?page=1&pageSize=3"   # lấy product_id thật
# POST → PUT (đảo thứ tự) → GET → DELETE/DELETE bulk-delete
docker logs ketoan-fixdb 2>&1 | grep -E 'inv_doc_line'               # phải thấy doc_id + pos trong INSERT
docker rm -f ketoan-fixdb
```

### 11.3 MUST NOT mới (rút ra từ phiên 2)

- ❌ **Không** quay lại `@OneToMany` + `@JoinColumn` + `@OrderColumn` (một chiều) cho `InvDoc.lines` ⇒ tái tạo lỗi `doc_id` NULL.
- ❌ **Không** bỏ `linkLines(...)` / `em.flush()` sau `clear()` trong `InvDocResource` (mất `pos` hoặc vi phạm `UNIQUE(doc_id,pos)`).
- ❌ **Không** đổi `InvLine.doc` thành `EAGER` hoặc bỏ `@JsonIgnore` (vòng lặp JSON + N+1).
- ❌ **Không** chạy `Fix B` (DROP NOT NULL `doc_id`/`pos`) — schema hiện tại **đúng**, chỉ mapping sai.
- ❌ **Không** sửa trực tiếp `V00001–V00006` (Flyway checksum) ⇒ mọi thay đổi schema phải là `V00007__*.sql`.

### 11.4 PROMPT MỞ TASK MỚI (copy nguyên khối dưới)

```text
Bối cảnh: dự án Quarkus 3.39.3 + React 18/Vite 5 tại /home/tbvinh/projects/ketoan-2026/quarkus-app.
Phiên trước (17/10/2026) đã fix xong lỗi `null value in column "doc_id"` của module Kho (Fix A):
  - InvDoc.lines: @OneToMany(mappedBy="doc", cascade=ALL, orphanRemoval=true) + @OrderBy("pos asc")
  - InvLine: thêm @ManyToOne @JoinColumn(name="doc_id") @JsonIgnore + field pos
  - InvDocResource: linkLines() + em.flush() sau d.clear()
  Kết quả: POST=201, PUT=200, DELETE=204, doc_id/pos luôn có giá trị (đã test trên Postgres 15 thật).

Đọc TRƯỚC (chỉ các file này, KHÔNG quét cả cây thư mục):
  1. .ai/SESSION.md §10–§11 (nhật ký phiên gần nhất + việc tiếp theo)
  2. IMPLEMENTATION_REPORT.md (§10 "Việc tiếp theo") và BEFORE_AFTER.md
  3. .ai/RULES.md — đặc biệt BE-E9, §1.1, §5 (nợ đã biết)
  4. .ai/modules/inventory-agent.md §2/§3 và .ai/modules/inventory-architect.md §4
  5. CHANGELOG.md, PROJECT_STATUS.md

Nhiệm vụ: ĐỒNG BỘ TÀI LIỆU THEO FIX A (chỉ sửa file .md — KHÔNG sửa code Java/FE, KHÔNG tạo migration, KHÔNG đổi hành vi):
  1. .ai/RULES.md: sửa BE-E9 theo pattern ĐÚNG — chi tiết (detail) dùng @ManyToOne @JoinColumn(name="<parent>_id", nullable=false) + field pos ở phía con, collection dùng @OneToMany(mappedBy="...") + @OrderBy("pos asc"); thêm ghi chú "tuyệt đối không dùng @JoinColumn/@OrderColumn trên @OneToMany một chiều vì Hibernate sẽ INSERT thiếu FK ⇒ vi phạm NOT NULL (xem DEBUG_REPORT.md)".
  2. .ai/modules/inventory-agent.md + .ai/modules/inventory-architect.md: cập nhật vòng đời InvLine = 1 câu INSERT/dòng có doc_id + pos; khi PUT phải em.flush() sau khi clear() để tránh UNIQUE(doc_id,pos); thêm rủi ro tương ứng.
  3. CHANGELOG.md: thêm mục "[Fix doc_id NULL khi lưu phiếu kho] - 2026-10-17" (Fixed) mô tả 3 file + kết quả 500 → 201/200.
  4. PROJECT_STATUS.md: cập nhật dòng phân hệ Kho (lỗi lưu phiếu đã hết, có bằng chứng test) và §4 next steps.
  5. Ghi kết quả vào .ai/SESSION.md bằng mục mới "§12. PHIÊN 3 — <ngày>: đồng bộ tài liệu sau Fix A" (bảng file đã sửa + việc còn lại).

Ràng buộc: không tạo file mới ngoài .md; không sửa V00001–V00006; giữ nguyên tiếng Việt trong tài liệu; trả lời bằng tiếng Việt kèm bảng file đã sửa và diff tóm tắt.
```

**Nếu muốn làm việc khác, thay dòng "Nhiệm vụ" bằng một trong các mục §11.1** (ưu tiên 2–7) — phần "Bối cảnh / Đọc TRƯỚC / Ràng buộc" giữ nguyên.





