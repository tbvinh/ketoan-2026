# TRẠNG THÁI DỰ ÁN (PROJECT STATUS) — KẾ TOÁN 2026

> **Cập nhật lần cuối:** 30/10/2026  
> **Phiên bản:** `1.0.7`  
> **Tiến độ tổng thể:** **~92% HOÀN THÀNH**

---

## 1. TỔNG QUAN HỆ THỐNG & TECH STACK

* **Backend:** Quarkus 3.39.3, Java 21 LTS (Adoptium Temurin), Hibernate ORM với Panache (Active Record / `PanacheEntityBase`), RESTEasy Reactive Jackson, Agroal Connection Pool, SmallRye JWT (RSA-2048), BCrypt, xuất Excel native (`XlsxWriter`), đọc số thành chữ (`AmountInWords`), kiến trúc Multi-tenant theo công ty (`com.ketoan.tenant.*`).
* **Database:** PostgreSQL 15 (Docker), Flyway Database Migrations (`V00001` -> `V00018`), `pg_trgm` fuzzy text search, `pgcrypto`.
* **Frontend:** React 18.3.1, Vite 5.4.21, tích hợp đóng gói qua Quarkus Quinoa (`quarkus-quinoa` 2.9.0), Ribbon UI phong cách Office 365, đa ngôn ngữ i18n (Việt - Anh), hash history routing, StatusBar & MediaUpload.
* **Triển khai & Đóng gói:** Hỗ trợ build `uber-jar`, GraalVM Native Image (`Dockerfile.native`, `build-images-native.sh`), Docker Compose (`postgres`, `app`, `nginx`).

---

## 2. MA TRẬN TIẾN ĐỘ THEO TỪNG PHÂN HỆ

| Phân hệ / Module | Trạng thái | Tiến độ | Ghi chú & Đánh giá |
| :--- | :---: | :---: | :--- |
| **Hạ tầng, Docker & Đóng gói** | ✅ Hoàn thành | 95% | Build `uber-jar` & Native image; tích hợp Quinoa SPA; cấu hình `docker-compose.yml` và `nginx`. |
| **Xác thực & Đa công ty (Auth & Tenant)** | ✅ Hoàn thành | 95% | Login bằng HttpOnly Cookie `token` (`/api/auth/loginv1`), BCrypt, `/api/auth/me`, Logout; chọn & chuyển đổi dữ liệu theo Công ty (`DmCongTy`, `TenantFilter`, `V00016`–`V00017`). |
| **Phân quyền RBAC & Quản trị (`admin`)** | ✅ Hoàn thành | 95% | Lưu trữ đầy đủ dưới DB (`V00015`: `Role`, `Permission`, `RolePermission`, `UserRole`), kiểm tra quyền qua `PermissionService` ở backend và quản lý User/Role/Permission/Company trên UI. |
| **Danh mục (`catalog`) & Media** | ✅ Hoàn thành | 95% | Generic `MasterResource<T>` mở rộng lên 11 danh mục (`Supplier`, `Customer`, `Partner`, `Bank`, `Account`, `MaterialType`, `Material`, `Warehouse`, `Unit`, `Department`, `Employee`), xuất Excel (`MasterExportResource`), upload ảnh/media (`V00018`, `MediaResource`). |
| **Nghiệp vụ Kho (`inventory`)** | 🟢 Đang hoàn thiện | 90% | Schema `V00005`–`V00009` (phiếu nhập/xuất/trả/điều chuyển `PN/PX/PT/PC`, kho nhập/xuất); đã sửa lỗi `doc_id` NULL (Fix A: mapping 2 chiều + `pos`); tìm kiếm/lọc/phân trang ở server; in phiếu & xuất Excel (`.xlsx`). |
| **Số dư đầu kỳ (`opening`)** | ✅ Hoàn thành | 90% | Migration `V00011`, `OpeningBalanceResource`, giao diện nhập/cập nhật số dư đầu kỳ tài khoản & tồn kho. |
| **Quỹ tiền mặt (`cash`)** | ✅ Hoàn thành | 90% | Migration `V00012`, `CashVoucherResource`, quản lý Phiếu thu / Phiếu chi, in chứng từ (`print.js`) và xuất Excel. |
| **Ngân hàng (`bank`)** | ✅ Hoàn thành | 90% | Migration `V00013`, `BankVoucherResource`, quản lý Báo nợ (Ủy nhiệm chi) / Báo có, xuất Excel. |
| **Tổng hợp & Kết chuyển (`general`)** | ✅ Hoàn thành | 90% | Migration `V00014`, `GeneralResource` & `ClosingEntryResource`, chứng từ kế toán chung (Master-Detail) và bút toán kết chuyển cuối kỳ. |
| **Báo cáo (`reports`)** | ✅ Hoàn thành | 90% | `InventoryReportResource` + plugin `reports`: tổng hợp nhập-xuất-tồn, thẻ kho, sổ chi tiết và xuất báo cáo Excel. |
| **Kiểm thử tự động (Testing)** | 🔴 Cần cập nhật | 20% | `pom.xml` đang đặt `skipTests=true`; cần viết bộ `@QuarkusTest` cho Auth, Danh mục, Kho và các phân hệ kế toán. |

---

## 3. CÁC VẤN ĐỀ ĐÃ KHẮC PHỤC THÀNH CÔNG (RESOLVED ISSUES)

1. **Khắc phục lỗi Foreign Key Schema Mismatch trong Flyway `V00005__document.sql`**:
   * Đồng bộ kiểu dữ liệu các cột khóa ngoại từ `bigint` về `varchar(36)` để khớp với các bảng danh mục gốc.
2. **Khắc phục lỗi Entity Panache & lỗi `null value in column "doc_id"` khi lưu phiếu kho (Fix A — 17/10/2026)**:
   * Chuyển `InvDoc` và `InvLine` kế thừa `PanacheEntityBase`.
   * Chuyển quan hệ `InvDoc.lines` sang mapping 2 chiều (`@OneToMany(mappedBy = "doc", cascade = ALL, orphanRemoval = true)` + `@OrderBy("pos asc")`) và thêm `@ManyToOne @JoinColumn(name = "doc_id", nullable = false) @JsonIgnore` + `pos` ở `InvLine`.
   * Bổ sung `linkLines()` và `em.flush()` sau `d.lines.clear()` trong `InvDocResource`, giúp `POST` (201) và `PUT` (200) chạy chuẩn xác 1 câu `INSERT`/dòng, không vi phạm `NOT NULL` hay `UNIQUE(doc_id, pos)`.
3. **Khắc phục lỗi thiếu Cookie trong HTTP Client `http.js` & tự động đăng xuất khi 401**:
   * Bổ sung `credentials: 'include'`, header tenant công ty và `configureHttp({ onUnauthorized: clearSession })` kèm `resetAllStores()` khi đổi phiên.
4. **Hoàn thiện Tìm kiếm, Lọc, Phân trang Server-side & Dữ liệu mẫu cho Kho (`16/10/2026`)**:
   * Loại bỏ hoàn toàn `fakeApi` và lọc client-side; chuyển sang `GET /api/inventory/docs?q&type&dateFrom&dateTo&page&pageSize&sort&dir` trả `{items, total}`.
   * Tạo migration `V00006__document_data.sql` seed dữ liệu mẫu idempotent.
5. **Mở rộng toàn diện các phân hệ Kế toán, RBAC DB & Multi-tenant (`V00007` -> `V00018`)**:
   * Đưa phân quyền từ `localStorage` xuống PostgreSQL (`V00015`) bảo vệ các endpoint bằng `PermissionService`.
   * Hoàn thiện các phân hệ Kho đa kho/điều chuyển, Số dư đầu kỳ, Tiền mặt, Ngân hàng, Tổng hợp & Kết chuyển, Báo cáo và Xuất Excel.
6. **Dọn dẹp mã nguồn & Dependencies (`19/10/2026`)**:
   * Xóa toàn bộ thư mục legacy `src/main/webui-v1` và các file copy/backup thừa (`*copy*.jsx`, `router-3.js`).
   * Loại bỏ khai báo dependency trùng lặp (`quarkus-qute`, `quarkus-hibernate-orm-panache`) trong `pom.xml`.

---

## 4. KẾ HOẠCH CÁC BƯỚC TIẾP THEO (NEXT STEPS)

1. ~~**Backend InvDocResource**: Bổ sung tìm kiếm, lọc theo loại phiếu/ngày và phân trang phía server.~~ ✅ **ĐÃ XONG (16/10/2026)**
2. ~~**Sửa lỗi `doc_id` NOT NULL khi tạo/cập nhật phiếu kho (Fix A)**~~ ✅ **ĐÃ XONG (17/10/2026)**
3. ~~**Dọn dẹp mã nguồn (`webui-v1`, file `*copy*`, dependency trùng trong `pom.xml`)**~~ ✅ **ĐÃ XONG (19/10/2026)**
4. **Đồng bộ các tài liệu kỹ thuật còn lại**:
   * Cập nhật quy tắc `BE-E9` trong [`.ai/RULES.md`](file:///home/tbvin/projects/ketoan-2026/quarkus-app/.ai/RULES.md) theo đúng pattern mapping 2 chiều của Fix A.
   * Cập nhật [`CHANGELOG.md`](file:///home/tbvin/projects/ketoan-2026/quarkus-app/CHANGELOG.md) và [`COMPONENT_MAPPING.md`](file:///home/tbvin/projects/ketoan-2026/quarkus-app/COMPONENT_MAPPING.md) để phản ánh Fix A cùng các phân hệ mới (`V00007`–`V00018`).
5. **Nâng cấp kỹ thuật phân hệ Kho (`InvDocResource` / `InvLine`)**:
   * Chuyển sinh số phiếu từ `InvDoc.count("type", d.type) + 1` sang dùng bảng `inv_doc_counter` (tránh trùng số khi xóa phiếu hoặc lưu đồng thời).
   * Đổi kiểu `qty` và `price` trong `InvLine` từ `long` sang `BigDecimal` cho khớp cột `numeric(18,3)` / `numeric(18,2)` của DB.
   * Validate chi tiết payload `create/update` ở server (`qty > 0`, `price >= 0`, độ dài `note`) trả `400 {"message": ...}`.
   * Bổ sung endpoint `GET /api/inventory/docs/{id}` và cân nhắc thêm cột `grand_total` / DTO danh sách để hỗ trợ sort theo cột "Tổng cộng" và bỏ N+1 query.
6. **Cập nhật Unit / Integration Tests (`@QuarkusTest`)**:
   * Viết test tự động cho luồng Auth (`loginv1`), phân quyền RBAC, CRUD Danh mục và Phiếu kho (POST/PUT đảo thứ tự dòng/DELETE/phân trang), sau đó bật lại test trong `pom.xml` (`skipTests=false`).
