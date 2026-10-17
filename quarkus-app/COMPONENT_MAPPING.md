# COMPONENT & MODULE MAPPING — DỰ ÁN KẾ TOÁN 2026

> **Tài liệu tra cứu cấu trúc Component & Module toàn dự án**.  
> Mục đích: Định vị chính xác vị trí file, input/output, dependencies và luồng logic để phục vụ bảo trì, chỉnh sửa nhanh và **tiết kiệm tối đa token**.

---

## MỤC LỤC
1. [Frontend Core Components & Modules (`src/main/webui/src/core`)](#1-frontend-core-components--modules)
2. [Frontend Plugins / Nghiệp vụ (`src/main/webui/src/plugins`)](#2-frontend-plugins--nghiệp-vụ)
3. [Backend REST Resources / Controllers (`src/main/java/com/ketoan/resource`)](#3-backend-rest-resources--controllers)
4. [Backend Services, Security & Config (`src/main/java/com/ketoan/service, config`)](#4-backend-services-security--config)
5. [Backend Entities & DTOs (`src/main/java/com/ketoan/entity, dto`)](#5-backend-entities--dtos)
6. [Database Migrations (`src/main/resources/db/migration`)](#6-database-migrations)
7. [Token-Saving Rules (Quy tắc đọc code tiết kiệm token)](#7-token-saving-rules)

---

## 1. FRONTEND CORE COMPONENTS & MODULES

### 1.1 Shell (Khung giao diện chính)
* **Tên Component & Đường dẫn:** `Shell` (`src/main/webui/src/core/Shell.jsx`)
* **Chức năng chính:** Khung bao ngoài của toàn bộ ứng dụng, kết hợp Topbar, Ribbon tabstrip, thanh điều hướng dọc (Rail navigation), ngăn menu con (Sidebar) và vùng hiển thị chính của từng Plugin.
* **Input (Props/State):**
  * Đọc context `useAuth()` (lấy `user`, hàm `logout`), `useI18n()` (hàm dịch `t`, `lang`, `setLang`), `usePermissions()`.
  * State nội bộ: `nav` từ `useHistoryState` (gồm `pluginId`, `found`, `store`), `tab` (Ribbon tab đang chọn), `query` (từ khóa tìm kiếm Topbar), `navOpen` (trạng thái ẩn/hiện Sidebar lưu ở `localStorage`).
* **Output (Events/Data):**
  * Điều phối render `active.View`, `active.Menu`, `Ribbon`, hoặc `GlobalSearch`.
  * Cung cấp bộ props `{ bus, role, can, state, setState }` cho Plugin con.
* **Dependencies:** `plugins.js`, `auth.jsx`, `i18n.jsx`, `permissions.js`, `GlobalSearch.jsx`, `ribbon.jsx`, `router.js`.
* **Các hàm/logic quan trọng:**
  * `can(pluginId, action)`: Kiểm tra quyền Admin hoặc quyền trong ma trận phân quyền.
  * `refresh()`: Gọi hàm `active.refresh()` hoặc kích hoạt re-render thông qua `state.reload`.
  * `openResult(p, r)`: Chuyển thẳng tới Plugin và khôi phục trạng thái khi người dùng chọn kết quả từ Global Search.

---

### 1.2 Login (Màn hình đăng nhập)
* **Tên Component & Đường dẫn:** `Login` (`src/main/webui/src/core/Login.jsx`)
* **Chức năng chính:** Hiển thị form đăng nhập, xác thực tài khoản và xử lý phản hồi đăng nhập từ server.
* **Input (Props/State):**
  * Đọc `useAuth().login`, `useI18n().t`.
  * State nội bộ: `u` (username, mặc định `'admin'`), `p` (password), `err` (thông báo lỗi), `busy` (cờ chờ request).
* **Output (Events/Data):** Gọi `login(u, p)` để lưu thông tin user và set HttpOnly cookie trên trình duyệt.
* **Dependencies:** `auth.jsx`, `i18n.jsx`, `ui.jsx` (`Spinner`).
* **Các hàm/logic quan trọng:**
  * `submit(e)`: Chặn spam submit khi `busy`, gọi `login` và hiển thị thông điệp lỗi tương ứng mã HTTP 401/403 hoặc lỗi kết nối.

---

### 1.3 Ribbon (Thanh công cụ Microsoft Office style)
* **Tên Component & Đường dẫn:** `Ribbon` (`src/main/webui/src/core/ribbon.jsx`)
* **Chức năng chính:** Render hệ thống tab và các nhóm nút lệnh dạng Ribbon (Tệp, Trang chủ, Xem, Trợ giúp và các Tab do Plugin đăng ký thêm).
* **Input (Props/State):**
  * Props: `tabs` (mảng cấu hình tab), `tab` (id tab hiện tại), `setTab` (hàm đổi tab).
* **Output (Events/Data):** Kích hoạt `item.onClick` tương ứng của từng nút bấm trong Ribbon.
* **Dependencies:** `i18n.jsx`.
* **Các hàm/logic quan trọng:**
  * `commonTabs({...})`: Định nghĩa các tab chuẩn của hệ thống (Đăng xuất, Refresh, In, Ẩn/Hiện Sidebar, Đổi ngôn ngữ, Giới thiệu).
  * `buildTabs(common, extra)`: Gộp các tab chung với các tab mở rộng do Plugin tự đóng góp (`extra.tabs`, `extra.groups`).

---

### 1.4 Autocomplete (Ô nhập liệu có gợi ý & tạo nhanh)
* **Tên Component & Đường dẫn:** `Autocomplete` (`src/main/webui/src/core/Autocomplete.jsx`)
* **Chức năng chính:** Ô chọn đối tượng (nhà cung cấp, khách hàng, vật tư, ngân hàng) có gợi ý debounce, hỗ trợ tạo nhanh bản ghi mới ngay trong danh sách xổ xuống.
* **Input (Props/State):**
  * Props: `value` (`{id, name}`), `onChange(item)`, `fetcher(query)`, `placeholder`, `disabled`, `onCreate(name)`, `createLabel`.
  * State nội bộ: `q` (chuỗi hiển thị), `dirty` (người dùng đang gõ), `open` (bật/tắt popup), `opts` (kết quả tìm kiếm), `loading`, `creating`.
* **Output (Events/Data):** Gọi `onChange(item)` khi chọn mục hoặc gọi `onCreate(name)` để thêm mới danh mục.
* **Dependencies:** `ui.jsx` (`Spinner`), `i18n.jsx`.
* **Các hàm/logic quan trọng:**
  * `norm(s)`: Chuẩn hóa chuỗi so sánh (loại bỏ dấu tiếng Việt, ký tự hoa).
  * `pick(o)`: Chọn giá trị gợi ý và cập nhật lại state.
  * Tự động đóng popup khi bấm ra ngoài (`mousedown` listener).

---

### 1.5 GlobalSearch (Tìm kiếm toàn hệ thống)
* **Tên Component & Đường dẫn:** `GlobalSearch` (`src/main/webui/src/core/GlobalSearch.jsx`)
* **Chức năng chính:** Tìm kiếm từ khóa xuyên suốt tất cả các plugin mà người dùng có quyền đọc.
* **Input (Props/State):**
  * Props: `query`, `plugins`, `can(pluginId, 'read')`, `onOpen(plugin, result)`, `onClose()`.
* **Output (Events/Data):** Hiển thị danh sách kết quả nhóm theo từng Plugin, bấm vào kết quả sẽ kích hoạt `onOpen`.
* **Dependencies:** `api.js` (`useApi`), `i18n.jsx`, `ui.jsx` (`Loading`).
* **Các hàm/logic quan trọng:**
  * Component con `Group`: Thực hiện gọi `plugin.search(query)` độc lập để hiển thị kết quả của từng plugin.

---

### 1.6 ConfirmDialog & ConfirmProvider (Hộp thoại xác nhận thao tác)
* **Tên Component & Đường dẫn:** `ConfirmProvider`, `useConfirm` (`src/main/webui/src/core/confirm.jsx`)
* **Chức năng chính:** Cung cấp hàm `confirm(message)` bất đồng bộ (trả về `Promise<boolean>`) để thay thế `window.confirm()` mặc định bằng modal UI đẹp mắt.
* **Input (Props/State):** Message xác nhận qua lời gọi `confirm(message)`.
* **Output (Events/Data):** Trả về `true` (khi chọn Đồng ý) hoặc `false` (khi Hủy).
* **Dependencies:** `i18n.jsx`.
* **Các hàm/logic quan trọng:**
  * `confirm(message)`: Trả về một `Promise` và lưu `resolve` vào state để đợi người dùng click.

---

### 1.7 Auth Module & Context (Quản lý phiên đăng nhập)
* **Tên Component & Đường dẫn:** `AuthProvider`, `useAuth` (`src/main/webui/src/core/auth.jsx`)
* **Chức năng chính:** Quản lý state đăng nhập của người dùng, kiểm tra phiên hoạt động với server qua endpoint `/api/auth/me`, và điều phối logout.
* **Input (Props/State):** Đọc cache người dùng từ `localStorage` (`KEY = 'user'`).
* **Output (Events/Data):** Context `{ user, login(username, password), logout() }`.
* **Dependencies:** `api.js` (`apiFetch`, `setUnauthorizedHandler`).
* **Các hàm/logic quan trọng:**
  * `login(u, p)`: Gọi POST tới `/api/auth/loginv1`, sau đó gọi GET `/api/auth/me` để lấy role và thông tin đầy đủ.
  * Tự động đăng ký `setUnauthorizedHandler(clearSession)`: Khi gặp mã lỗi 401 từ bất kỳ API nào, ứng dụng sẽ tự động xóa session và quay về trang Login.

---

### 1.8 Router & History State (Điều hướng ứng dụng)
* **Tên Component & Đường dẫn:** `useHistoryState` (`src/main/webui/src/core/router.js`)
* **Chức năng chính:** Đồng bộ state màn hình (plugin đang chọn, bộ lọc, trang) vào `location.hash` giúp hỗ trợ phím Back/Forward của trình duyệt mà không cần cài thêm thư viện router ngoài nặng nề.
* **Input (Props/State):** Trạng thái khởi tạo `initial`.
* **Output (Events/Data):** `[state, nav(next, { replace })]`.
* **Dependencies:** React hooks tiêu chuẩn.
* **Các hàm/logic quan trọng:**
  * `decode()` & `encode()`: Serialize/Deserialize trạng thái qua URI component hash (`#...`).
  * Lắng nghe sự kiện `popstate` để cập nhật lại state khi bấm Back/Forward.

---

### 1.9 Plugins Manager & Event Bus (Hệ thống Plugin)
* **Tên Component & Đường dẫn:** `registerPlugin`, `usePlugins`, `bus` (`src/main/webui/src/core/plugins.js`)
* **Chức năng chính:** Đăng ký và quản lý danh sách plugin động trong toàn hệ thống, cung cấp Event Bus `bus.on / bus.emit` để các plugin trao đổi thông tin mà không phụ thuộc lẫn nhau.
* **Input/Output:** `registerPlugin(pluginDefinition)`, `usePlugins()` trả về danh sách plugin đã sort theo thuộc tính `order`.
* **Dependencies:** `i18n.jsx` (`addMessages`).

---

### 1.10 Permissions (Ma trận phân quyền)
* **Tên Component & Đường dẫn:** `usePermissions`, `togglePerm` (`src/main/webui/src/core/permissions.js`)
* **Chức năng chính:** Lưu trữ và quản lý bảng phân quyền CRUD cho vai trò "user" (hiện đang lưu tại `localStorage.perms_user`).
* **Input/Output:** `PLUGIN_IDS` (`inventory`, `catalog`), `ACTIONS` (`read`, `create`, `update`, `delete`), hàm `togglePerm(pluginId, action)`.
* **Dependencies:** `useSyncExternalStore`.

---

### 1.11 i18n (Đa ngôn ngữ)
* **Tên Component & Đường dẫn:** `I18nProvider`, `useI18n`, `addMessages`, `LangSwitch` (`src/main/webui/src/core/i18n.jsx`)
* **Chức năng chính:** Cung cấp từ điển song ngữ Việt - Anh, hàm `t(key)` và dropdown đổi ngôn ngữ `LangSwitch`.
* **Input/Output:** State ngôn ngữ (`vi` hoặc `en`), lưu tại `localStorage.lang`.

---

### 1.12 HTTP Clients (`http.js` & `api.js`)
* **Tên Component & Đường dẫn:**
  * `http` (`src/main/webui/src/core/http.js`): Client fetch chính cho dữ liệu MasterData (`get`, `post`, `put`, `patch`, `delete`). *(Lưu ý: Cần bổ sung `credentials: 'include'`)*.
  * `apiFetch` (`src/main/webui/src/core/api.js`): Client fetch dùng cho Auth và GlobalSearch, có sẵn `credentials: 'include'`.
* **Chức năng chính:** Wrapper quanh `fetch` chuẩn hóa header `Accept: application/json`, bắt lỗi `HttpError` / `ApiError`, xử lý mã lỗi 401.

---

### 1.13 Master Data Stores Layer (`masterdata.js`, `createstore.js`, `mockstore.js`)
* **Tên Component & Đường dẫn:**
  * `masterdata.js` (`src/main/webui/src/core/masterdata.js`): Khởi tạo 6 store chính (`suppliersStore`, `customersStore`, `banksStore`, `materialTypesStore`, `materialsStore`, `accountsStore`) cùng các hàm autocomplete `searchSuppliers`, `searchCustomers`, `searchBanks`, `searchMaterials`.
  * `createstore.js` (`src/main/webui/src/core/createstore.js`): Xây dựng store gọi **API Thật** qua `http.js` (hỗ trợ `use()`, `useQuery()`, `search()`, `add()`, `update()`, `remove()`).
  * `mockstore.js` (`src/main/webui/src/core/mockstore.js`): Store chạy **API Giả** trong bộ nhớ trình duyệt khi `VITE_USE_REAL_API=false`.
  * `useasyncquery.js` (`src/main/webui/src/core/useasyncquery.js`): Hook dùng chung xử lý debounce, huỷ request (`AbortController`), cờ `fetching`, `loading`, `reload`.

---

## 2. FRONTEND PLUGINS / NGHIỆP VỤ

### 2.1 Plugin Danh Mục (`catalog`)
* **Tên Component & Đường dẫn:** `CatalogPlugin` (`src/main/webui/src/plugins/catalog/index.jsx`)
* **Chức năng chính:** Quản lý toàn bộ 6 danh mục: Nhà cung cấp, Khách hàng, Vật tư, Loại vật tư, Ngân hàng, Tài khoản kế toán. Hỗ trợ xem, thêm, sửa, xóa lẻ, xóa hàng loạt, tìm kiếm, lọc, phân trang, tải template CSV và import CSV.
* **Input (Props/State):**
  * Nhận `{ state, setState, can }` từ Shell.
  * State nội bộ: `category` (danh mục đang chọn), `q` (từ khóa tìm), `filters`, `sort`, `page`, `pageSize`, `selected` (các id đang tick), `editing` (bản ghi đang sửa/thêm), `importing` (bật/tắt box import).
* **Output (Events/Data):** Tác động dữ liệu qua các store trong `masterdata.js`.
* **Dependencies:** `masterdata.js`, `i18n.jsx`, `ui.jsx`, `Denied.jsx`, `confirm.jsx`.
* **Các component con & hàm nội bộ:**
  * `Menu`: Render danh sách các danh mục ở Sidebar.
  * `Toolbar`: Ô tìm kiếm + các bộ lọc đặc thù theo danh mục + badge số dòng.
  * `Pager`: Thanh phân trang (Trang đầu, trước, sau, cuối, số dòng/trang).
  * `Body`: Chứa logic `useQuery`, bảng dữ liệu `invtable zebra`, form sửa `invmaster`.
  * `importRows()`: Parse CSV, validate dữ liệu, tự động tạo loại vật tư mới nếu chưa có, và import vào store.
  * `downloadTemplate(catId)`: Sinh file CSV mẫu chuẩn UTF-8 có BOM.

---

### 2.2 Plugin Nhập Xuất Kho (`inventory`)
* **Tên Component & Đường dẫn:** `InventoryPlugin` (`src/main/webui/src/plugins/inventory/index.jsx`)
* **Chức năng chính:** Quản lý phiếu kho: Lập Phiếu nhập (`import`), Phiếu xuất (`export`), Phiếu trả (`return`). Hỗ trợ Master-Detail, kéo thả đổi thứ tự dòng hàng, tính thành tiền tự động, và import phiếu từ CSV.
* **Input (Props/State):**
  * Nhận `{ state, setState, can }` từ Shell.
  * State nội bộ: `mode` (`'list'` hoặc `'form'`), `filterType` (`'all' | 'import' | 'export' | 'return'`), `editing` (object phiếu kho đang soạn thảo), `selected` (các phiếu đang chọn để bulk delete).
* **Output (Events/Data):** Hiện tại đang lưu vào biến nhớ `SEED_DOCS` qua `fakeApi`. *(Cần nối vào `InvDocResource` của backend)*.
* **Dependencies:** `masterdata.js`, `Autocomplete.jsx`, `confirm.jsx`, `ui.jsx`, `Denied.jsx`.
* **Các component con & hàm nội bộ:**
  * `ListView`: Hiển thị danh sách phiếu, phân trang, lọc theo ngày, chọn xóa nhiều.
  * `FormView`: Form lập phiếu Master-Detail. Master gồm: Đối tác, Ngân hàng, Ngày, Ghi chú. Detail gồm: Danh sách hàng hóa, số lượng, đơn giá, kéo thả thứ tự (`draghandle`).
  * `importDocs()`: Parse file CSV nhiều dòng có chung cột `ref` thành 1 phiếu Master-Detail.

---

### 2.3 Plugin Quản Trị (`admin`)
* **Tên Component & Đường dẫn:** `AdminPlugin` (`src/main/webui/src/plugins/admin/index.jsx`)
* **Chức năng chính:** Cung cấp giao diện bảng ma trận tick chọn phân quyền (Xem, Thêm, Sửa, Xóa) cho vai trò "Người dùng" áp dụng lên từng Plugin.
* **Input (Props/State):** Đọc quyền qua `usePermissions()`, vai trò qua Shell.
* **Output (Events/Data):** Gọi `togglePerm(id, action)` để ghi nhận thay đổi quyền.
* **Dependencies:** `i18n.jsx`, `permissions.js`.

---

## 3. BACKEND REST RESOURCES / CONTROLLERS

### 3.1 MasterResource (Generic Base Resource)
* **Tên Class & Đường dẫn:** `MasterResource<T extends MasterEntity>` (`src/main/java/com/ketoan/resource/MasterResource.java`)
* **Chức năng chính:** Lớp trừu tượng cung cấp toàn bộ API CRUD chuẩn hóa cho tất cả các danh mục:
  * `GET /api/{resource}`: Danh sách có tìm kiếm mờ `q`, lọc linh hoạt, sắp xếp an toàn chống SQL injection, phân trang (`page`, `pageSize`) hoặc lấy tất cả (tối đa 10.000 dòng).
  * `GET /api/{resource}/{id}`: Lấy chi tiết theo ID.
  * `POST /api/{resource}`: Thêm mới, tự động sinh mã `code` nếu trống theo `codePrefix()`, flush kiểm tra trùng lặp trả HTTP 409 Conflict.
  * `PUT /api/{resource}/{id}`: Cập nhật bản ghi.
  * `DELETE /api/{resource}/{id}`: Xóa bản ghi, bắt ngoại lệ khóa ngoại trả 409 Conflict.
* **Bảo mật:** `@Authenticated` (yêu cầu cookie JWT hợp lệ).

---

### 3.2 Các Resource Danh mục Cụ thể
Tất cả đều kế thừa `MasterResource<T>`:
* **AccountResource** (`src/main/java/com/ketoan/resource/AccountResource.java`): `@Path("/accounts")` - Quản lý tài khoản kế toán, hỗ trợ lọc nhóm tài khoản (`group=1xx`).
* **BankResource** (`src/main/java/com/ketoan/resource/BankResource.java`): `@Path("/banks")` - Quản lý ngân hàng, hỗ trợ lọc chi nhánh (`branch`).
* **CustomerResource** (`src/main/java/com/ketoan/resource/CustomerResource.java`): `@Path("/customers")` - Quản lý khách hàng, tự sinh mã tiền tố `KH`, lọc có/không có số điện thoại.
* **SupplierResource** (`src/main/java/com/ketoan/resource/SupplierResource.java`): `@Path("/suppliers")` - Quản lý nhà cung cấp, tự sinh mã tiền tố `NCC`, lọc số điện thoại.
* **MaterialTypeResource** (`src/main/java/com/ketoan/resource/MaterialTypeResource.java`): `@Path("/material-types")` - Quản lý loại vật tư.
* **MaterialResource** (`src/main/java/com/ketoan/resource/MaterialResource.java`): `@Path("/materials")` - Quản lý vật tư, tự sinh mã tiền tố `VT`, hỗ trợ join bảng `MaterialType` để sắp xếp theo tên loại (`typeName`), lọc theo khoảng giá (`priceMin`, `priceMax`), lọc theo `typeId`.

---

### 3.3 AuthResource
* **Tên Class & Đường dẫn:** `AuthResource` (`src/main/java/com/ketoan/resource/AuthResource.java`)
* **Chức năng chính:** Tiếp nhận các yêu cầu xác thực người dùng:
  * `POST /api/auth/register`: Đăng ký tài khoản mới.
  * `POST /api/auth/login`: Đăng nhập cơ bản trả token trong body.
  * `POST /api/auth/loginv1`: Đăng nhập bảo mật, tạo JWT và đính kèm vào HttpOnly Cookie `token` (SameSite=Lax, MaxAge=86400s).
  * `GET /api/auth/me`: Đọc JWT từ ngữ cảnh, trả về `{ username, name, role }` (`@RolesAllowed({"admin", "user"})`).
  * `POST /api/auth/logout`: Xóa phiên bằng cách set cookie `token` có `maxAge = 0`.
* **Dependencies:** `AuthService`, `JsonWebToken`.

---

### 3.4 InvDocResource (Quản lý Phiếu Kho Backend)
* **Tên Class & Đường dẫn:** `InvDocResource` (`src/main/java/com/ketoan/resource/InvDocResource.java`)
* **Chức năng chính:** Cung cấp API quản lý phiếu nhập/xuất/trả kho (yêu cầu đăng nhập — `@Authenticated`):
  * `GET /api/inventory/docs`: **Tìm kiếm/lọc/phân trang** — tham số `q`, `type`, `dateFrom`, `dateTo`, `page`, `pageSize`, `sort`, `dir` ⇒ trả `{ items, total }` (không tham số ⇒ tối đa 10.000 dòng).
  * `POST /api/inventory/docs`: Tạo phiếu mới, tự sinh số phiếu `PNxxxx` / `PXxxxx` / `PTxxxx`.
  * `PUT /api/inventory/docs/{id}`: Cập nhật thông tin phiếu và chi tiết các dòng hàng.
  * `DELETE /api/inventory/docs/{id}`: Xóa phiếu kho (`@RolesAllowed("admin")`).
  * `POST /api/inventory/docs/bulk-delete`: Xóa hàng loạt theo danh sách ID (`@RolesAllowed("admin")`, tối đa 500 id/lần).

---

## 4. BACKEND SERVICES, SECURITY & CONFIG

### 4.1 AuthService
* **Tên Class & Đường dẫn:** `AuthService` (`src/main/java/com/ketoan/service/AuthService.java`)
* **Chức năng chính:**
  * Xác thực mật khẩu với hash BCrypt (`BcryptUtil.matches`).
  * Khởi tạo và ký chữ ký số RSA 2048 cho token JWT (`Jwt.issuer(...).subject(...).groups(...).sign()`).
  * Đăng ký người dùng mới với mật khẩu băm BCrypt.

### 4.2 SecurityFilter & RestApplication
* **SecurityFilter** (`src/main/java/com/ketoan/config/SecurityFilter.java`): JAX-RS `ContainerRequestFilter` chặn kiểm tra sự tồn tại của Cookie `token` trước khi chuyển tiếp vào các endpoint nghiệp vụ.
* **RestApplication** (`src/main/java/com/ketoan/config/RestApplication.java`): Thiết lập prefix `@ApplicationPath("/api")` cho toàn bộ hệ thống REST API.

---

## 5. BACKEND ENTITIES & DTOS

### 5.1 Các Entity Danh mục (`src/main/java/com/ketoan/entity/`)
* **`MasterEntity`** (`MasterEntity.java`): `@MappedSuperclass` chứa các thuộc tính chung: `id` (String UUID tự sinh qua `@PrePersist`), `code` (String), `name` (String).
* **`Bank`** (`Bank.java`): Bảng `banks`, thêm trường `branch`.
* **`Customer`** (`Customer.java`): Bảng `customers`, thêm `phone`, `address`.
* **`Supplier`** (`Supplier.java`): Bảng `suppliers`, thêm `phone`, `address`.
* **`Account`** (`Account.java`): Bảng `accounts`.
* **`MaterialType`** (`MaterialType.java`): Bảng `material_types`.
* **`Material`** (`Material.java`): Bảng `materials`, thêm `unit`, `price`, `typeId` (`@Column(name = "type_id")`).
* **`User`** (`User.java`): Bảng `users`, kế thừa `PanacheEntityBase`, chứa `id` (Long auto-increment), `username`, `password`, `role`.

### 5.2 Các Entity Nghiệp vụ Kho
* **`InvDoc`** (`InvDoc.java`): Bảng `inv_doc`, đại diện phiếu kho. Gồm `id` (Long), `no` (Số phiếu PN/PX/PT), `type`, `date`, `partner` (Embedded Ref), `bank` (Embedded Ref), `note`, `lines` (`@OneToMany` trỏ tới `InvLine`).
* **`InvLine`** (`InvLine.java`): Bảng `inv_doc_line`, đại diện dòng chi tiết hàng. Gồm `id` (Long), `product` (Embedded Ref), `qty`, `price`, `lineTotal` (tự tính từ DB).

### 5.3 DTOs
* **`AuthRequest`** (`src/main/java/com/ketoan/dto/AuthRequest.java`): Chứa `{ username, password }`.
* **`AuthResponse`** (`src/main/java/com/ketoan/dto/AuthResponse.java`): Chứa `{ token }`.

---

## 6. DATABASE MIGRATIONS (`src/main/resources/db/migration/`)

| File Migration | Tên Bảng Tạo / Thay Đổi | Mục Đích |
| :--- | :--- | :--- |
| **`V00001__init.sql`** | `users` | Khởi tạo bảng người dùng ban đầu. |
| **`V00002__add_password...sql`** | `users` | Thêm cột `password` (BCrypt), cột `role`, chèn tài khoản mẫu `admin`/`user1`. |
| **`V00003__add_master_data.sql`** | `suppliers`, `customers`, `banks`, `accounts`, `material_types`, `materials` | Khởi tạo 6 bảng danh mục, kích hoạt `pg_trgm`, tạo GIN indexes tìm kiếm mờ và Unique Index không phân biệt hoa thường. Khóa chính `id VARCHAR(36)`. |
| **`V00004__master_date_dummy.sql`** | - | Nạp dữ liệu giả lập chuẩn tiếng Việt cho 6 bảng danh mục. |
| **`V00005__document.sql`** | `inv_doc_counter`, `inv_doc`, `inv_doc_line` | Khởi tạo bảng đếm phiếu kho và 2 bảng Master-Detail lưu phiếu nhập/xuất/trả (khóa ngoại đã chuẩn hóa sang `VARCHAR(36)`; `line_total` là cột generated). |
| **`V00006__document_data.sql`** | `inv_doc`, `inv_doc_line`, `inv_doc_counter` | **Dữ liệu mẫu phiếu kho**: 9 phiếu (PN/PX/PT) + 17 dòng hàng để thử tìm kiếm/lọc/phân trang. Mọi `INSERT` đều có điều kiện `WHERE NOT EXISTS` (áp lên DB đã có dữ liệu vẫn an toàn), tham chiếu danh mục theo `code`, và đồng bộ `inv_doc_counter.last_no`. |

---

## 7. TOKEN-SAVING RULES (QUY TẮC BẮT BUỘC KHI SỬA ĐỔI DỰ ÁN)

> [!IMPORTANT]
> **DÀNH CHO AGENT / AI ASSISTANT TRONG CÁC LẦN LÀM VIỆC TIẾP THEO:**

1. **Tuyệt đối KHÔNG quét lại toàn bộ cây thư mục (No Full Folder Scanning):**
   * Khi người dùng yêu cầu sửa đổi, thêm mới hoặc vá lỗi một tính năng, Agent **CHỈ ĐƯỢC PHÉP ĐỌC ĐÚNG** các file liên quan trực tiếp đến tính năng đó dựa theo bảng ánh xạ trong tài liệu này.
   * Không chạy lệnh `ls -R`, `Get-ChildItem -Recurse`, hoặc đọc các file không liên quan để tránh lãng phí context và token.

2. **Bảng phân vùng tra cứu nhanh khi nhận yêu cầu:**
   * **Sửa Đăng nhập / Token / Phân quyền / Session:**
     * Đọc: `src/main/webui/src/core/auth.jsx`, `Login.jsx`, `http.js`, `api.js` (Frontend).
     * Đọc: `src/main/java/com/ketoan/resource/AuthResource.java`, `service/AuthService.java`, `config/SecurityFilter.java` (Backend).
   * **Sửa Giao diện Ribbon / Thanh điều hướng / Đa ngôn ngữ:**
     * Đọc: `src/main/webui/src/core/Shell.jsx`, `ribbon.jsx`, `i18n.jsx`, `router.js`.
   * **Sửa Nghiệp vụ Danh mục (Khách hàng, NCC, Vật tư, Ngân hàng, Tài khoản):**
     * Đọc: `src/main/webui/src/plugins/catalog/index.jsx`, `core/masterdata.js`, `core/createstore.js` (Frontend).
     * Đọc: `src/main/java/com/ketoan/resource/MasterResource.java` và Resource danh mục cụ thể tương ứng (Backend).
   * **Sửa Nghiệp vụ Nhập - Xuất - Trả kho (Inventory):**
     * Đọc: `src/main/webui/src/plugins/inventory/index.jsx`, `core/Autocomplete.jsx` (Frontend).
     * Đọc: `src/main/java/com/ketoan/resource/InvDocResource.java`, `entity/InvDoc.java`, `entity/InvLine.java`, `src/main/resources/db/migration/V00005__document.sql` (Backend).
   * **Sửa Lỗi Kết nối API / Cookie / CORS / Build:**
     * Đọc: `src/main/resources/application.properties`, `pom.xml`, `src/main/webui/vite.config.js`, `src/main/webui/src/core/http.js`.

3. **Chỉnh sửa chính xác theo phạm vi:**
   * Chỉ sửa các hàm mục tiêu bằng công cụ replace chuyên biệt, giữ nguyên cấu trúc và comment giải thích hiện có của các phần không liên quan.

