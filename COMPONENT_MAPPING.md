# COMPONENT & MODULE MAPPING — DỰ ÁN KẾ TOÁN 2026

> **Cập nhật lần cuối:** 30/10/2026 (`v1.0.7`)  
> **Mục đích:** Định vị chính xác vị trí file, input/output, dependencies và luồng logic để phục vụ bảo trì, chỉnh sửa nhanh và **tiết kiệm tối đa token**.

---

## MỤC LỤC
1. [Frontend Core Components & Modules (`src/main/webui/src/core`, `src/api`)](#1-frontend-core-components--modules)
2. [Frontend Plugins / Nghiệp vụ (`src/main/webui/src/plugins`)](#2-frontend-plugins--nghiệp-vụ)
3. [Backend REST Resources / Controllers (`src/main/java/com/ketoan/resource`)](#3-backend-rest-resources--controllers)
4. [Backend Services, Multi-Tenant & Security (`src/main/java/com/ketoan/service, tenant, config`)](#4-backend-services-multi-tenant--security)
5. [Backend Entities & DTOs (`src/main/java/com/ketoan/entity, dto`)](#5-backend-entities--dtos)
6. [Database Migrations (`src/main/resources/db/migration`)](#6-database-migrations)
7. [Token-Saving Rules (Bảng tra cứu nhanh & Quy tắc đọc code)](#7-token-saving-rules)

---

## 1. FRONTEND CORE COMPONENTS & MODULES

### 1.1 Khung Giao Diện & Điều Hướng
* **`Shell`** (`src/main/webui/src/core/Shell.jsx`): Khung bao ngoài của ứng dụng (Topbar, chọn Công ty/Tenant, Ribbon tabstrip, Rail navigation, Sidebar, StatusBar và vùng hiển thị `active.View`). Cung cấp `{ bus, role, can, state, setState }` cho từng Plugin.
* **`Login`** (`src/main/webui/src/core/Login.jsx`): Màn hình đăng nhập, gọi `useAuth().login(u, p)`.
* **`Ribbon`** (`src/main/webui/src/core/ribbon.jsx`): Thanh công cụ phong cách Office 365 (`commonTabs` + `extra` tab do từng Plugin đăng ký).
* **`StatusBar`** (`src/main/webui/src/core/StatusBar.jsx`): Thanh trạng thái dưới cùng hiển thị thông tin người dùng, công ty hiện tại và phiên bản.
* **`GlobalSearch`** (`src/main/webui/src/core/GlobalSearch.jsx`): Tìm kiếm từ khóa xuyên suốt tất cả các plugin mà người dùng có quyền đọc (`plugin.search(query)`).
* **`useHistoryState`** (`src/main/webui/src/core/router.js`): Đồng bộ state màn hình vào `location.hash` hỗ trợ Back/Forward.

### 1.2 UI Tiện Ích Dùng Chung
* **`Autocomplete`** (`src/main/webui/src/core/Autocomplete.jsx`): Ô chọn đối tượng (nhà cung cấp, khách hàng, vật tư, ngân hàng, tài khoản, kho...) có debounce và hỗ trợ tạo nhanh bản ghi mới (`onCreate`).
* **`MediaUpload`** (`src/main/webui/src/core/MediaUpload.jsx`): Component tải lên và xem trước hình ảnh/tài liệu đính kèm qua `/api/media`.
* **`ConfirmProvider` / `useConfirm`** (`src/main/webui/src/core/confirm.jsx`): Hộp thoại xác nhận bất đồng bộ (`Promise<boolean>`).
* **`ui.jsx` & `icons.jsx` & `Denied.jsx`** (`src/main/webui/src/core/`): Các nguyên tử UI (`Spinner`, `Loading`, `vnd`), bộ icon SVG và màn hình từ chối truy cập.
* **`useDebounced`** (`src/main/webui/src/core/useDebounced.js`): Hook debounce 300ms dùng chung cho các màn hình danh sách.

### 1.3 Auth, Tenant, Permissions, i18n & HTTP
* **`AuthProvider` / `useAuth`** (`src/main/webui/src/core/auth.jsx`): Quản lý phiên đăng nhập (`/api/auth/loginv1`, `/api/auth/me`, `/api/auth/logout`), tự động xóa session và `resetAllStores()` khi gặp 401.
* **`tenant.js`** (`src/main/webui/src/core/tenant.js`): Quản lý công ty (tenant) đang chọn, đồng bộ với `http.js` qua header `X-Company-Id`.
* **`permissions.js`** (`src/main/webui/src/core/permissions.js`): Quản lý và kiểm tra ma trận quyền hạn (`can(pluginId, action)`) đồng bộ từ backend RBAC.
* **`i18n.jsx`** (`src/main/webui/src/core/i18n.jsx`): Từ điển song ngữ Việt - Anh (`t(key)`, `addMessages`, `LangSwitch`).
* **`http.js` & `api.js`** (`src/main/webui/src/core/`): Wrapper quanh `fetch` tự động đính kèm `credentials: 'include'` (HttpOnly Cookie `token`) và xử lý lỗi chuẩn hóa.

### 1.4 Master Data Stores & API Clients
* **`masterdata.js`, `createstore.js`, `mockstore.js`, `useasyncquery.js`** (`src/main/webui/src/core/`): Quản lý state và truy vấn phân trang cho 11 danh mục (`suppliers`, `customers`, `partners`, `banks`, `accounts`, `materialTypes`, `materials`, `warehouses`, `units`, `departments`, `employees`).
* **Modules API (`src/main/webui/src/api/`)**:
  * `inventoryApi.js` (`/api/inventory/docs`)
  * `cashApi.js` (`/api/cash/vouchers`)
  * `bankApi.js` (`/api/bank/vouchers`)
  * `generalApi.js` (`/api/general/vouchers`, `/api/closing-entries`)
  * `adminApi.js` (`/api/users`, `/api/roles`, `/api/permissions`, `/api/companies`, `/api/company-data`, `/api/system`)

---

## 2. FRONTEND PLUGINS / NGHIỆP VỤ (`src/main/webui/src/plugins`)

| Plugin ID | Đường dẫn | Chức năng chính |
| :--- | :--- | :--- |
| **`catalog`** | `plugins/catalog/index.jsx` | Quản lý 11 danh mục chuẩn (CRUD, lọc đa trường, phân trang server, bulk delete, import CSV, tải template, xuất Excel, đính kèm ảnh). |
| **`inventory`** | `plugins/inventory/index.jsx`, `voucher.js` | Quản lý Phiếu nhập (`PN`), Phiếu xuất (`PX`), Phiếu trả (`PT`), Phiếu điều chuyển kho (`PC`). Master-Detail, chọn kho nhập/xuất, kéo thả dòng hàng, in phiếu (`voucher.js`), import CSV, xuất Excel. |
| **`opening`** | `plugins/opening/index.jsx` | Quản lý số dư đầu kỳ tài khoản kế toán và tồn kho đầu kỳ vật tư. |
| **`cash`** | `plugins/cash/index.jsx`, `print.js` | Quản lý Quỹ tiền mặt: Phiếu thu (`PT`), Phiếu chi (`PC`), in chứng từ (`print.js`), xuất Excel. |
| **`bank`** | `plugins/bank/index.jsx` | Quản lý Ngân hàng: Báo nợ / Ủy nhiệm chi (`BN`), Báo có (`BC`), xuất Excel. |
| **`general`** | `plugins/general/index.jsx` | Chứng từ kế toán tổng hợp (Master-Detail định khoản Nợ/Có) và bút toán kết chuyển cuối kỳ. |
| **`reports`** | `plugins/reports/index.jsx` | Hệ thống báo cáo: Tổng hợp Nhập - Xuất - Tồn, Thẻ kho, Sổ chi tiết vật tư, Sổ quỹ/ngân hàng và xuất Excel. |
| **`admin`** | `plugins/admin/index.jsx` | Quản trị hệ thống: Quản lý Người dùng, Vai trò (Roles), Ma trận Phân quyền (RBAC DB), Danh mục Công ty (Multi-tenant), Sao lưu/Khôi phục dữ liệu công ty. |

---

## 3. BACKEND REST RESOURCES / CONTROLLERS (`src/main/java/com/ketoan/resource`)

* **`MasterResource<T>`** (`MasterResource.java`): Lớp cơ sở generic cung cấp CRUD, tìm kiếm mờ `q`, lọc, sắp xếp whitelist, phân trang và kiểm tra trùng mã (`409 Conflict`).
* **11 Resource Danh mục kế thừa `MasterResource<T>`**:
  * `AccountResource` (`/api/accounts`), `BankResource` (`/api/banks`), `CustomerResource` (`/api/customers`), `SupplierResource` (`/api/suppliers`), `PartnerResource` (`/api/partners`), `MaterialTypeResource` (`/api/material-types`), `MaterialResource` (`/api/materials`), `WarehouseResource` (`/api/warehouses`), `UnitResource` (`/api/units`), `DepartmentResource` (`/api/departments`), `EmployeeResource` (`/api/employees`).
* **`MasterExportResource`** (`MasterExportResource.java`): Xuất danh sách các danh mục ra file `.xlsx`.
* **`MediaResource`** (`MediaResource.java`): Upload, phục vụ và quản lý file ảnh/tài liệu đính kèm (`/api/media`).
* **`InvDocResource`** (`InvDocResource.java`): Quản lý phiếu kho (`/api/inventory/docs`) — tìm kiếm/lọc/phân trang, tạo mới, cập nhật (`linkLines` + `em.flush()`), xóa lẻ, xóa hàng loạt, import và xuất Excel (`/{id}/export-excel`).
* **`OpeningBalanceResource`** (`OpeningBalanceResource.java`): API số dư đầu kỳ (`/api/opening-balances`).
* **`CashVoucherResource`** (`CashVoucherResource.java`): API phiếu thu/chi tiền mặt (`/api/cash/vouchers`) + xuất Excel.
* **`BankVoucherResource`** (`BankVoucherResource.java`): API báo nợ/báo có ngân hàng (`/api/bank/vouchers`) + xuất Excel.
* **`GeneralResource` & `ClosingEntryResource`**: API phiếu kế toán tổng hợp (`/api/general/vouchers`) và bút toán kết chuyển (`/api/closing-entries`).
* **`InventoryReportResource`** (`InventoryReportResource.java`): API báo cáo nhập-xuất-tồn, thẻ kho và xuất Excel báo cáo.
* **`AuthResource`, `UserResource`, `RoleResource`, `PermissionResource`, `CompanyResource`, `CompanyDataResource`, `SystemResource`**: Nhóm API xác thực, quản trị người dùng/vai trò/quyền hạn và quản lý dữ liệu đa công ty.

---

## 4. BACKEND SERVICES, MULTI-TENANT & SECURITY

* **`AuthService`** (`service/AuthService.java`): Xác thực BCrypt, phát hành JWT RSA-2048.
* **`PermissionService`** (`service/PermissionService.java`): Kiểm tra quyền RBAC theo người dùng/vai trò (`require(module, action)`).
* **`AdminService` & `CompanyService`** (`service/`): Xử lý nghiệp vụ quản trị RBAC và thông tin công ty.
* **`TenantFilter`, `CompanyTenantResolver`, `TenantContext`, `TenantRegistry`, `TenantProvisioner`** (`tenant/`, `service/`): Định tuyến kết nối/schema theo công ty và khởi tạo dữ liệu cho công ty mới.
* **`XlsxWriter` & `AmountInWords`** (`service/`): Tiện ích sinh file Excel `.xlsx` nhẹ không phụ thuộc thư viện nặng, và đọc số tiền bằng chữ tiếng Việt.
* **`MediaSampleSeeder`** (`service/MediaSampleSeeder.java`): Khởi tạo ảnh minh họa mẫu.
* **`SecurityFilter` & `RestApplication`** (`config/`): Kiểm tra cookie JWT và khai báo `@ApplicationPath("/api")`.

---

## 5. BACKEND ENTITIES & DTOS (`src/main/java/com/ketoan/entity, dto`)

* **Danh mục (`MasterEntity` subclasses):** `Account`, `Bank`, `Customer`, `Supplier`, `Partner`, `MaterialType`, `Material`, `Warehouse`, `Unit`, `Department`, `Employee`.
* **Kho:** `InvDoc` (bảng `inv_doc`, `@OneToMany(mappedBy="doc") @OrderBy("pos asc")`) & `InvLine` (bảng `inv_doc_line`, `@ManyToOne @JoinColumn(name="doc_id", nullable=false) @JsonIgnore`, `pos`).
* **Kế toán:** `OpeningBalance`, `CashVoucher`, `BankVoucher`, `GeneralVoucher`, `GeneralVoucherLine`, `ClosingEntry`.
* **Quản trị & Đa công ty:** `User`, `Role`, `Permission`, `RolePermission`, `UserRole`, `DmCongTy`.
* **DTOs (`dto/`):** `AuthRequest`, `AuthResponse`, `UserRequest`.

---

## 6. DATABASE MIGRATIONS (`src/main/resources/db/migration/`)

| Migration | Bảng / Thay đổi | Mục đích |
| :--- | :--- | :--- |
| **`V00001` – `V00002`** | `users` | Bảng người dùng, mật khẩu BCrypt, vai trò mặc định. |
| **`V00003` – `V00004`** | 6 bảng danh mục gốc | `suppliers`, `customers`, `banks`, `accounts`, `material_types`, `materials` + `pg_trgm` + dữ liệu mẫu. |
| **`V00005` – `V00006`** | `inv_doc`, `inv_doc_line`, `inv_doc_counter` | Schema phiếu kho Master-Detail và 9 phiếu kho mẫu idempotent. |
| **`V00007` – `V00009`** | `warehouses`, `inv_doc` | Thêm danh mục Kho, cột `warehouse_in_*`/`warehouse_out_*` và loại phiếu điều chuyển `transfer` (`PC`). |
| **`V00010`** | `units`, `departments`, `employees`, `partners` | Mở rộng thêm 4 bảng danh mục chuẩn. |
| **`V00011`** | `opening_balances` | Bảng số dư đầu kỳ. |
| **`V00012`** | `cash_vouchers` | Bảng phiếu thu / phiếu chi tiền mặt. |
| **`V00013`** | `bank_vouchers` | Bảng báo nợ / báo có ngân hàng. |
| **`V00014`** | `general_vouchers`, `general_voucher_lines`, `closing_entries` | Bảng chứng từ kế toán tổng hợp và bút toán kết chuyển. |
| **`V00015`** | `roles`, `permissions`, `role_permissions`, `user_roles` | Hệ thống phân quyền RBAC lưu trong DB. |
| **`V00016` – `V00017`** | `dm_congty` | Danh mục công ty và thông tin pháp nhân phục vụ Multi-tenant. |
| **`V00018`** | `media_files` | Quản lý file/hình ảnh tải lên. |

---

## 7. TOKEN-SAVING RULES (QUY TẮC BẮT BUỘC KHI SỬA ĐỔI DỰ ÁN)

> [!IMPORTANT]
> **DÀNH CHO AGENT / AI ASSISTANT TRONG CÁC LẦN LÀM VIỆC TIẾP THEO:**
> 1. **Tuyệt đối KHÔNG quét toàn bộ cây thư mục:** Chỉ đọc đúng các file liên quan trực tiếp theo bảng trong [`.ai/PROJECT_GUIDE.md`](file:///home/tbvin/projects/ketoan-2026/quarkus-app/.ai/PROJECT_GUIDE.md) hoặc mục 2 & 3 của tài liệu này.
> 2. **Không đọc các file báo cáo điều tra cũ** (`DEBUG_REPORT.md`, `BEFORE_AFTER.md`, `IMPLEMENTATION_REPORT.md`) trừ khi người dùng yêu cầu trực tiếp.
> 3. **Giữ nguyên cấu trúc Master–Detail 2 chiều (Fix A)** cho mọi chứng từ nhiều dòng (`InvDoc`/`InvLine`, `GeneralVoucher`/`GeneralVoucherLine`).
