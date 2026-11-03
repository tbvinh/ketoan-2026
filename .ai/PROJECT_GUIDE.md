# Project Guide — Kế Toán 2026 (Digest Tiết Kiệm Token)

> **Cập nhật:** 30/10/2026 · **Phiên bản:** `1.0.7`
> **Mục đích:** Điểm khởi đầu duy nhất (~100 dòng) giúp AI nắm toàn bộ kiến trúc, quy ước và định vị chính xác file cần đọc mà **không bao giờ phải quét cây thư mục**.

## 1. Tech Stack Thực Tế (KHÔNG phải Spring Boot)

| Hạng mục | Thực tế trong repo |
| :--- | :--- |
| **Backend** | **Quarkus 3.39.3**, Java 21, RESTEasy Reactive (`@Path`, `@ApplicationPath("/api")`), CDI (`@Inject`, `@ApplicationScoped`) |
| **Persistence** | Hibernate ORM **Panache** (`PanacheEntityBase`) + `EntityManager`/JPQL — **KHÔNG có tầng Repository / MapStruct** |
| **Database** | PostgreSQL 15 + **Flyway** (`V00001`…`V00018`), `quarkus.hibernate-orm.database.generation=none` |
| **Auth & Tenant** | SmallRye JWT (RSA-2048) qua **HttpOnly cookie `token`**, BCrypt; Multi-tenant theo công ty (`X-Company-Id` / `TenantFilter`) |
| **RBAC** | Lưu DB (`V00015`: `Role`, `Permission`, `RolePermission`, `UserRole`), kiểm quyền ở BE qua `PermissionService.require(module, action)` |
| **Frontend** | **React 18 + Vite 5** (Quarkus Quinoa). **KHÔNG dùng Axios / React Router / Redux** — dùng `core/http.js` (`fetch`) + hash router `core/router.js` |

## 2. Quy Ước Cốt Lõi (MUST / MUST NOT)

### Backend
- **Resource & Danh mục:** Danh mục đơn giản kế thừa `MasterEntity` + `MasterResource<T>` (không viết lại CRUD).
- **Master–Detail JPA (Quy tắc Fix A — CỰC KỲ QUAN TRỌNG):**
  - Thực thể con (예: `InvLine`, `GeneralVoucherLine`) **BẮT BUỘC** sở hữu FK: `@ManyToOne(fetch = LAZY, optional = false) @JoinColumn(name = "<parent>_id", nullable = false) @JsonIgnore` + trường thứ tự `public int pos;`.
  - Thực thể cha dùng `@OneToMany(mappedBy = "<parent>", cascade = ALL, orphanRemoval = true) @OrderBy("pos asc")`.
  - **TUYỆT ĐỐI KHÔNG** dùng `@OneToMany` một chiều kèm `@JoinColumn`/`@OrderColumn` (Hibernate sẽ INSERT thiếu FK gây lỗi `NOT NULL`).
  - Khi `PUT` thay thế danh sách dòng con: gọi `lines.clear()` → **`em.flush()` ngay lập tức** → rồi mới gán dòng mới (`pos = 0..n-1`) để không đụng `UNIQUE(doc_id, pos)`.
- **Truy vấn & Bảo mật:** Sort qua whitelist; filter dùng named parameter; luôn có `@Authenticated` + `permissions.require("<module>", "<ACTION>")`.
- **Flyway:** Tuyệt đối **KHÔNG sửa** `V00001`–`V00018` đã chạy; mọi thay đổi schema tạo `V00019__*.sql` mới.

### Frontend
- **Plugin:** Mỗi phân hệ là 1 plugin trong `src/main/webui/src/plugins/<id>/index.jsx`, tự đăng ký qua `src/plugins/index.js`.
- **i18n:** Mọi chuỗi hiển thị đi qua `t('key')` và khai báo đủ cả `vi` + `en`.
- **API & Store:** Danh mục dùng store trong `core/masterdata.js`; chứng từ dùng `src/api/<module>Api.js` gọi qua `core/http.js` (đã tự kèm `credentials: 'include'` và header `X-Company-Id`).

## 3. Bảng Định Vị File Nhanh (Đọc Đúng File — Cấm Quét Thư Mục)

| Khi cần sửa / thêm tính năng... | File Frontend (`src/main/webui/src/`) | File Backend (`src/main/java/com/ketoan/`) | Migration (`db/migration/`) |
| :--- | :--- | :--- | :--- |
| **Đăng nhập / JWT / Session** | `core/auth.jsx`, `core/Login.jsx`, `core/api.js`, `core/http.js` | `resource/AuthResource.java`, `service/AuthService.java`, `config/SecurityFilter.java` | `V00001`, `V00002` |
| **Đa công ty (Multi-tenant)** | `core/tenant.js`, `core/Shell.jsx`, `core/http.js` | `tenant/TenantFilter.java`, `tenant/CompanyTenantResolver.java`, `tenant/TenantRegistry.java`, `service/TenantProvisioner.java`, `service/CompanyService.java`, `resource/CompanyResource.java`, `resource/CompanyDataResource.java`, `entity/DmCongTy.java` | `V00016`, `V00017` |
| **Phân quyền RBAC & Quản trị** | `plugins/admin/index.jsx`, `api/adminApi.js`, `core/permissions.js` | `service/PermissionService.java`, `service/AdminService.java`, `resource/{User,Role,Permission,System}Resource.java`, `entity/{User,Role,Permission,RolePermission,UserRole}.java` | `V00015` |
| **Khung UI / Ribbon / i18n / Router** | `core/Shell.jsx`, `core/ribbon.jsx`, `core/StatusBar.jsx`, `core/i18n.jsx`, `core/router.js`, `core/GlobalSearch.jsx` | — | — |
| **Danh mục (`catalog` — 11 loại)** | `plugins/catalog/index.jsx`, `core/masterdata.js`, `core/createstore.js`, `core/Autocomplete.jsx` | `resource/MasterResource.java`, `resource/MasterExportResource.java`, `resource/{Account,Bank,Customer,Supplier,Partner,MaterialType,Material,Warehouse,Unit,Department,Employee}Resource.java`, `entity/*` | `V00003`, `V00004`, `V00007`, `V00010` |
| **Upload Ảnh / Media** | `core/MediaUpload.jsx` | `resource/MediaResource.java`, `service/MediaSampleSeeder.java` | `V00018` |
| **Kho (`inventory` — PN/PX/PT/PC)** | `plugins/inventory/index.jsx`, `plugins/inventory/voucher.js`, `api/inventoryApi.js` | `resource/InvDocResource.java`, `entity/InvDoc.java`, `entity/InvLine.java` | `V00005`..`V00009` |
| **Số dư đầu kỳ (`opening`)** | `plugins/opening/index.jsx` | `resource/OpeningBalanceResource.java`, `entity/OpeningBalance.java` | `V00011` |
| **Tiền mặt (`cash` — Thu/Chi)** | `plugins/cash/index.jsx`, `plugins/cash/print.js`, `api/cashApi.js` | `resource/CashVoucherResource.java`, `entity/CashVoucher.java` | `V00012` |
| **Ngân hàng (`bank` — Báo nợ/có)** | `plugins/bank/index.jsx`, `api/bankApi.js` | `resource/BankVoucherResource.java`, `entity/BankVoucher.java` | `V00013` |
| **Tổng hợp & Kết chuyển (`general`)** | `plugins/general/index.jsx`, `api/generalApi.js` | `resource/GeneralResource.java`, `resource/ClosingEntryResource.java`, `entity/{GeneralVoucher,GeneralVoucherLine,ClosingEntry}.java` | `V00014` |
| **Báo cáo & Xuất Excel (`reports`)** | `plugins/reports/index.jsx` | `resource/InventoryReportResource.java`, `service/XlsxWriter.java`, `service/AmountInWords.java` | — |
