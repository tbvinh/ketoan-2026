# TRẠNG THÁI DỰ ÁN (PROJECT STATUS) — KẾ TOÁN 2026

> **Cập nhật lần cuối:** 16/10/2026  
> **Phiên bản:** `1.0.0-SNAPSHOT`  
> **Tiến độ tổng thể:** **~85% HOÀN THÀNH**

---

## 1. TỔNG QUAN HỆ THỐNG & TECH STACK

* **Backend:** Quarkus 3.39.3, Java 21 LTS (Adoptium Temurin), Hibernate ORM với Panache (Active Record), RESTEasy Reactive Jackson, Agroal Connection Pool, SmallRye JWT (RSA-2048), BCrypt.
* **Database:** PostgreSQL 15 (Docker), Flyway Database Migrations (`V00001` -> `V00005`), `pg_trgm` fuzzy text search, `pgcrypto`.
* **Frontend:** React 18.3.1, Vite 5.4.21, tích hợp đóng gói qua Quarkus Quinoa (`quarkus-quinoa`), Ribbon UI phong cách Office 365, đa ngôn ngữ i18n (Việt - Anh), hash history routing.

---

## 2. MA TRẬN TIẾN ĐỘ THEO TỪNG PHÂN HỆ

| Phân hệ / Module | Trạng thái | Tiến độ | Ghi chú & Đánh giá |
| :--- | :---: | :---: | :--- |
| **Hạ tầng & Đóng gói** | ✅ Hoàn thành | 95% | Build `uber-jar` thành công qua Maven; tích hợp Quinoa dev-server & build SPA. |
| **Xác thực & Bảo mật (Auth)** | ✅ Hoàn thành | 90% | Login bằng HttpOnly Cookie `token` (`/api/auth/loginv1`), mã hóa BCrypt, kiểm tra phiên (`/api/auth/me`), Logout xóa cookie. |
| **Danh mục (Master Data)** | ✅ Hoàn thành | 95% | Generic `MasterResource<T>` cho 6 danh mục; Frontend `catalog` hỗ trợ CRUD, lọc đa trường, phân trang, bulk delete, tải template và import CSV. |
| **Nghiệp vụ Kho (Inventory)** | 🟢 Đang hoàn thiện | 85% | Schema `V00005` + **dữ liệu mẫu `V00006`** (9 phiếu + 17 dòng hàng) + Entity Panache `InvDoc`/`InvLine`; **tìm kiếm/lọc/sắp xếp/phân trang ở server** (`GET /inventory/docs?q&type&dateFrom&dateTo&page&pageSize&sort&dir` → `{items,total}`); endpoint đã được bảo vệ (`@Authenticated`, xoá = `@RolesAllowed("admin")`). |
| **Phân quyền (Permissions)** | 🟡 Tạm ổn | 60% | Ma trận quyền CRUD chạy ở frontend lưu `localStorage.perms_user`, chưa đồng bộ bảng DB. |
| **Kiểm thử tự động (Testing)** | 🔴 Cần cập nhật | 20% | Đang có file test cũ `DanhMucTaiKhoanResourceTest.java`, cần bổ sung unit/integration tests cho Auth và Kho. |

---

## 3. CÁC VẤN ĐỀ ĐÃ KHẮC PHỤC THÀNH CÔNG (RESOLVED ISSUES)

1. **Khắc phục lỗi Foreign Key Schema Mismatch trong Flyway `V00005__document.sql`**:
   * Đồng bộ kiểu dữ liệu các cột khóa ngoại từ `bigint` về `varchar(36)` để khớp với bảng gốc `banks`, `materials`, `customers`, `suppliers`.
2. **Khắc phục lỗi Entity Panache trong `InvDoc.java` và `InvLine.java`**:
   * Chuyển kế thừa sang `PanacheEntityBase` để loại bỏ xung đột `@Id` kế thừa từ `PanacheEntity`, chỉ định tường minh `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)`.
   * Chuyển annotation `@Embedded @AttributeOverrides(...)` từ `@Id` xuống đúng trường `public Ref product;` trong `InvLine.java`.
3. **Khắc phục lỗi thiếu Cookie trong HTTP Client `http.js`**:
   * Bổ sung `credentials: 'include'` vào fetch request để gửi HttpOnly Cookie `token` tự động trong tất cả các request API thật.
4. **Khắc phục dữ liệu giả lập trong Plugin Kho `inventory/index.jsx`**:
   * Loại bỏ hoàn toàn `fakeApi` và `SEED_DOCS`.
   * Tạo module API [`inventoryApi.js`](file:///wsl.localhost/Ubuntu/home/tbvinh/projects/ketoan-2026/quarkus-app/src/main/webui/src/api/inventoryApi.js) kết nối trực tiếp endpoint `/inventory/docs`.
   * Bổ sung loading, saving state, banner thông báo lỗi và xử lý bất đồng bộ khi lưu/xóa/import CSV.
5. **Thiết lập tài liệu tối ưu Token**:
   * Đã tạo [`COMPONENT_MAPPING.md`](file:///wsl.localhost/Ubuntu/home/tbvinh/projects/ketoan-2026/quarkus-app/COMPONENT_MAPPING.md) ánh xạ toàn bộ component/module và quy tắc cấm quét toàn bộ folder.

---

## 4. KẾ HOẠCH CÁC BƯỚC TIẾP THEO (NEXT STEPS)

1. ~~**Backend InvDocResource**: Bổ sung tìm kiếm, lọc theo loại phiếu/ngày và phân trang phía server.~~ ✅ **ĐÃ XONG (16/10/2026)** — `list()` nhận `q/type/dateFrom/dateTo/page/pageSize/sort/dir` ⇒ `{items,total}`; kèm `@Authenticated` + `@RolesAllowed("admin")` cho xoá.
2. **Kho — nâng cấp tiếp**:
   * Thêm cột `grand_total` (hoặc bảng tổng hợp) để **sắp xếp theo “Tổng cộng”** ở server (hiện cột này chưa sort được).
   * Validate `create/update` ở server (đối tác bắt buộc, `qty > 0`, `price >= 0`, độ dài `note`) ⇒ 400 `{"message":…}` thay vì 500.
   * Sinh số phiếu bằng `inv_doc_counter` (tránh trùng khi đồng thời + không tái sử dụng số đã xoá).
   * DTO cho danh sách (không kèm `lines`, có `grandTotal`) để bỏ N+1 và giảm payload.
3. **Dọn dẹp mã nguồn (Cleanup)**:
   * Loại bỏ các file copy/backup thừa (`*copy*.jsx`, `router-3.js`).
   * Loại bỏ các khai báo dependency trùng lặp trong `pom.xml` (`quarkus-qute`, `quarkus-hibernate-orm-panache`).
4. **Cập nhật Unit/Integration Tests**:
   * Viết test kiểm tra luồng loginv1 và CRUD phiếu kho.
   * Thêm test cho `GET /api/inventory/docs` (401 khi chưa đăng nhập, 400 khi `type`/ngày sai, phân trang + tìm kiếm).

