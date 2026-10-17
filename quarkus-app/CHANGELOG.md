# CHANGELOG — DỰ ÁN KẾ TOÁN 2026

Toàn bộ các thay đổi quan trọng của dự án được ghi nhận tại file này theo định dạng chuẩn [Keep a Changelog](https://keepachangelog.com/).

---

## [Dữ liệu mẫu Phiếu kho] - 2026-10-16

### Added
* **Flyway `V00006__document_data.sql`** — dữ liệu mẫu cho module Kho: **9 phiếu** (PN0001–PN0003 nhập, PX0001–PX0003 xuất, PT0001–PT0003 trả) + **17 dòng hàng** (tổng 457.435.000 đ), ngày trải từ 1 đến 35 ngày trước để thử `dateFrom`/`dateTo`.
  * An toàn khi áp lên DB đã có dữ liệu: mọi `INSERT` đều có `WHERE NOT EXISTS` ⇒ không tạo trùng, không vỡ `UNIQUE(no)` / `UNIQUE(doc_id,pos)`.
  * Số phiếu **liên tục từ 0001 theo từng loại** — bắt buộc, vì `create()` hiện sinh số bằng `count(*)+1` (guide §7.1 #7) nên để "lỗ" số sẽ làm phiếu tạo kế tiếp trùng số.
  * Tham chiếu danh mục theo **mã nghiệp vụ** (`NCC-HOAPHAT`, `KH-COTECCONS`, `VCB`/`TCB`/`BIDV`, `VT-STEEL-10`…) vì `V00004` sinh `id` bằng `gen_random_uuid()`; tên đối tác được snapshot đúng như app làm.
  * Đồng bộ `inv_doc_counter.last_no` = max phần số của `no` theo từng loại (chuẩn bị cho việc chuyển sang dùng counter).
  * Khối `DO $$ … RAISE WARNING/NOTICE` log ra số phiếu/dòng sau khi seed (cảnh báo nếu danh mục V00004 chưa có).

---

## [Tính năng Tìm kiếm Phiếu Kho] - 2026-10-16

### Added
* **Tìm kiếm / lọc / phân trang phiếu kho ở server** (`InvDocResource.list`):
  * `GET /api/inventory/docs?q=&type=&dateFrom=&dateTo=&page=&pageSize=&sort=&dir=` → `{ "items": [...], "total": N }` — cùng hợp đồng với `MasterResource`; `pageSize` chặn trong `[1,100]`; không tham số ⇒ tối đa 10.000 dòng (phục vụ export/đối chiếu nhỏ).
  * `q` tìm không phân biệt hoa/thường trên `no`, `partner_name`, `note`; sắp xếp qua **whitelist** (`no`, `type`, `partner`, `date`), mặc định `id DESC`.
  * `type` sai hoặc ngày sai định dạng ⇒ `400 {"message": …}` (trước đây là `500`).
* **Frontend**: `inventoryApi.list(params)`; `ListView` debounce 300ms rồi gọi server, phân trang/đếm dòng theo `total`, chọn dòng theo trang hiện tại.
* **Global Search của Kho gọi API** (`search(q)` → `page=1&pageSize=20`) ⇒ tìm được cả phiếu không nằm trên trang đang xem.
* **`core/useDebounced.js`** — hook debounce dùng chung cho `catalog` + `inventory` (hết copy-paste).
* **`registerReset(fn)`** (`core/masterdata.js`) + `resetDocs()` của store kho ⇒ xoá cache khi đăng xuất/đổi tài khoản.

### Changed
* **Bỏ `setup(){ load(); }`** của plugin kho — dữ liệu chỉ tải khi đã đăng nhập.
* **Response danh sách phiếu**: mảng `InvDoc[]` → `{ items, total }`.
* **Xoá `SORT_GET` / `applyView`** (lọc + sắp xếp + phân trang ở client) — nay do server đảm nhiệm.
* **Cột “Tổng cộng” tạm không sắp xếp được** (cần cột `grand_total` trên `inv_doc`; xem `.ai/modules/inventory-architect.md` §10.5).
* **Bỏ nút “Chọn tất cả {n} phiếu”** — không thể chọn đúng toàn bộ kết quả khi phân trang ở server.

### Fixed
* **Bảo mật (P0 #1)**: `InvDocResource` thêm `@Authenticated`; `DELETE` và `bulk-delete` yêu cầu `@RolesAllowed("admin")`; `bulk-delete` chặn danh sách rỗng và > 500 id.
* **`inventoryApi.js` nhân đôi** ⇒ giữ 1 bản `src/api/inventoryApi.js`, xoá `src/core/inventoryApi.js` (guide §7.2 #13).
* **Thiếu key i18n** `inv.loadFailed` / `inv.saveFailed` / `inv.deleteFailed` (trước đây UI hiện nguyên tên key); bỏ key thừa `inv.selectAllResults`.
* **401 từ `core/http.js` (store/API nghiệp vụ) nay tự đăng xuất** nhờ `configureHttp({ onUnauthorized: clearSession })` trong `AuthProvider`.

---

## [1.0.0-SNAPSHOT] - 2026-10-16

### Added
* **Tài liệu Ánh xạ Component & Tối ưu Token (`COMPONENT_MAPPING.md`)**:
  * Định vị toàn bộ Component/Module kèm đường dẫn, chức năng, input/output, dependencies và các hàm quan trọng.
  * Thiết lập mục *Token-Saving Rules* cấm AI Agent quét lại toàn bộ thư mục khi thực hiện các tác vụ sau này.
* **Module API Kho Frontend (`inventoryApi.js`)**:
  * Tạo file `src/main/webui/src/api/inventoryApi.js` (và `src/main/webui/src/core/inventoryApi.js`) kết nối REST API `/inventory/docs` (GET list, GET by id, POST create, PUT update, DELETE, POST bulk-delete).
* **Báo cáo Trạng thái Dự án (`PROJECT_STATUS.md`)**:
  * Đánh giá hiện trạng, tiến độ các phân hệ và lộ trình hoàn thiện tiếp theo.

### Fixed
* **Database Migration (`V00005__document.sql`)**:
  * Sửa lỗi lệch kiểu dữ liệu khóa ngoại: Chuyển `partner_id` từ `bigint` thành `varchar(36)`.
  * Chuyển `bank_id` từ `bigint` thành `varchar(36) REFERENCES banks(id) ON DELETE SET NULL`.
  * Chuyển `product_id` từ `bigint` thành `varchar(36) NOT NULL REFERENCES materials(id)`.
* **JPA Entity `InvDoc.java`**:
  * Chuyển kế thừa từ `PanacheEntity` sang `PanacheEntityBase` để tránh xung đột trường `id` có sẵn của Panache với `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)`.
* **JPA Entity `InvLine.java`**:
  * Chuyển kế thừa sang `PanacheEntityBase`.
  * Khắc phục lỗi đặt nhầm annotation: Di chuyển cụm `@Embedded @AttributeOverrides(...)` từ trường `@Id public Long id;` xuống đúng trường `public Ref product;`.
* **HTTP Client Frontend (`src/main/webui/src/core/http.js`)**:
  * Bổ sung cấu hình `credentials: 'include'` vào hàm fetch của `request()` để tự động gửi HttpOnly Cookie `token` xuyên suốt mọi request API.

### Changed
* **Giao diện Phân hệ Kho (`src/main/webui/src/plugins/inventory/index.jsx`)**:
  * Loại bỏ hoàn toàn việc sử dụng dữ liệu giả `fakeApi` và mảng tĩnh `SEED_DOCS`.
  * Chuyển các hàm `load()`, `saveDoc()`, `removeDoc()`, `removeDocs()` sang gọi API thật bất đồng bộ thông qua `inventoryApi`.
  * Tự động chuẩn hóa payload phiếu kho trước khi gửi server (lọc bỏ id tạm phía client, chuyển đổi số hợp lệ).
  * Thêm trạng thái `saving` vào nút *"Lưu phiếu"* trong `FormView` để chống double-click.
  * Thêm banner thông báo lỗi và trạng thái `loading` trong `ListView`.
  * Cập nhật hàm `importDocs()` hỗ trợ `await saveDoc()` với khối `try/catch` bắt lỗi chi tiết từng dòng.

