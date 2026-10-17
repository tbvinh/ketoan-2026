# admin-agent.md — Module QUẢN TRỊ & PHÂN QUYỀN (Admin / Permissions)

> **Plugin id:** `admin` · **Icon:** 🛡️ · **order:** 99 · **`adminOnly: true`** (chỉ role `admin` thấy)
> **Backend route:** ❌ **KHÔNG CÓ** — module thuần frontend · **Bảng DB:** ❌ **KHÔNG CÓ** (lưu `localStorage.perms_user`)
> **Trạng thái:** 🟡 hoạt động một phần (~60%) · **Cập nhật:** 16/10/2026 · **Phiên bản:** `1.0.0-SNAPSHOT`
> **Đọc trước:** [`PROJECT_GUIDE.md`](../../PROJECT_GUIDE.md) §3.7 (permission), §7.1 #2 (P0 quyền ghi), §7.3 #32 (phân quyền chỉ ở localStorage)
> **Tài liệu liên quan:** [`COMPONENT_MAPPING.md`](../../COMPONENT_MAPPING.md) §1.10, §2.3

---

## 1. PURPOSE — Mục đích

Cho phép **admin** cấu hình **ma trận quyền CRUD** (`read` / `create` / `update` / `delete`) **theo từng plugin**, áp dụng cho vai trò **`user`**:

| Vai trò | Quyền |
| :--- | :--- |
| `admin` | **Luôn full quyền** trên mọi plugin — không nằm trong bảng, không thể bị khoá (`Shell.can()` trả `true` trước khi xét ma trận) |
| `user` | Theo ma trận: `perms[pluginId][action]` đọc từ `localStorage.perms_user`, mặc định lấy từ `DEFAULT` trong `core/permissions.js` |

**Cơ chế tác động (rất quan trọng để hiểu đúng phạm vi):**
- Bảng quyền **chỉ điều khiển UI**: ẩn plugin khỏi Rail (`adminOnly`), disable nút ghi (`disabled: !can(…)`), chặn xem bằng `<Denied/>`.
- **KHÔNG** phải lớp bảo mật: quyền thật phải do **server** kiểm tra (`@RolesAllowed`/`@Authenticated`) — hiện backend **chưa** kiểm tra theo ma trận này (xem §7).
- Ma trận lưu **trong trình duyệt** (`localStorage`) ⇒ chỉ có tác dụng trên máy/người dùng đó.

**Ngoài ra module này còn:** hiển thị 2 plugin đã "viết nhưng bị tắt" (`mail`, `calendar`, `people`, `tasks`) trong bảng quyền — dấu vết còn lại của thiết kế gốc kiểu Outlook.

---

## 2. BACKEND FILES

> ❌ **Không có file backend nào thuộc module này.** Không có `PermissionResource`, không có bảng `permissions`, không có service.

Các file backend **liên quan gián tiếp** (chỉ để lấy role):

| File | Liên quan thế nào |
| :--- | :--- |
| `src/main/java/com/ketoan/resource/AuthResource.java` (`GET /api/auth/me`) | Trả `role` (`admin`/`user`) mà FE dùng cho `can()`. Ma trận `perms` **không** được gửi kèm |
| `src/main/java/com/ketoan/service/AuthService.java` (`normalizeRole`) | Chuẩn hoá role thành `admin`\|`user` — chỉ 2 giá trị này tồn tại |
| `src/main/java/com/ketoan/resource/MasterResource.java` (`@Authenticated` ở class) | Nơi **cần** thêm `@RolesAllowed("admin")` để biến ma trận UI thành bảo mật thật (P0 #2) |
| `src/main/java/com/ketoan/resource/InvDocResource.java` | ⚠️ Không có annotation bảo vệ nào ⇒ quyền `inventory.*` hoàn toàn không được enforce |
| `src/main/resources/db/migration/*` | Không có bảng nào cho phân quyền ⇒ muốn lưu server-side phải thêm migration mới |

**Hệ quả khi sửa:** mọi thay đổi của module này nằm ở **frontend**; không cần build lại backend, không cần migration (trừ khi chọn phương án P2 #32 — lưu quyền vào DB).

---

## 3. FRONTEND FILES

| File | Vai trò | Chi tiết cần biết |
| :--- | :--- | :--- |
| `src/main/webui/src/plugins/admin/index.jsx` | **Toàn bộ UI của module** (`View` + export default) | `NAMES` map `pluginId → key i18n`; `messages` (`admin.*`); `View` render `<table className="permtable">` với checkbox `checked={!!perms[id][a]}` và `onChange={() => togglePerm(id, a)}`; export `{id:'admin', title:'admin.title', icon:'🛡️', order:99, adminOnly:true, messages, View}` (⚠️ **không có** `Menu`, `ribbon`, `search`, `initialState`) |
| `src/main/webui/src/core/permissions.js` | **Trạng thái quyền (store đơn giản)** | `PLUGIN_IDS = ['inventory','catalog']`; `ACTIONS = ['read','create','update','delete']`; `DEFAULT` (inventory: read/create/update=true, delete=false; catalog: tất cả true); `load()` = `{...DEFAULT, ...JSON.parse(localStorage.perms_user)}`; `togglePerm(pluginId, action)` (lật + ghi localStorage + notify); `usePermissions()` = `useSyncExternalStore` |
| `src/main/webui/src/core/Shell.jsx` | **Nơi thực thi quyền** | `const can = (pluginId, action) => role === 'admin' \|\| !!perms[pluginId]?.[action];`; `plugins.filter(p => !p.adminOnly \|\| role === 'admin')` ⇒ Rail; truyền `can` xuống mọi plugin |
| `src/main/webui/src/core/GlobalSearch.jsx` | Dùng quyền để lọc | `plugins.filter(p => p.search && can(p.id,'read'))` |
| `src/main/webui/src/core/Denied.jsx` | UI bị chặn | Mỗi plugin tự trả `<Denied/>` khi thiếu quyền `read` |
| `src/main/webui/src/plugins/catalog/index.jsx` | **Người dùng quyền** | `can('catalog','read'/'create'/'update'/'delete')` cho View, form, nút xoá, xoá hàng loạt, import |
| `src/main/webui/src/plugins/inventory/index.jsx` | **Người dùng quyền** | `can('inventory', …)` cho View, ribbon tạo phiếu, xoá phiếu/dòng, import; đồng thời dùng `can('catalog','create')` để tạo nhanh danh mục |
| `src/main/webui/src/core/i18n.jsx` | Chuỗi | `perm.denied`, `role.admin`, `role.user` (dùng chung); `admin.*` do plugin tự đăng ký |
| `src/main/webui/src/plugins/{mail,calendar,people,tasks}/index.jsx` | ⏸ Plugin bị `SKIPPED_PLUGINS` ẩn | Vẫn gọi `can('mail'|'calendar'|'people'|'tasks', …)` và vẫn có tên trong `NAMES` của admin |

**Chi tiết bên trong `plugins/admin/index.jsx` (35 dòng — ngắn nhất trong các plugin):**

```js
const NAMES = { mail:'mail.title', calendar:'cal.title', people:'people.title',
                tasks:'tasks.title', inventory:'inv.title', catalog:'cat.title' };
```
- `messages`: `admin.title`, `admin.perm`, `admin.plugin`, `admin.read/create/update/delete`, `admin.note` (vi + en).
- `View`: đọc `usePermissions()` ⇒ render bảng `PLUGIN_IDS × ACTIONS`; `perms[id][a]` **không** dùng optional chaining ⇒ **sẽ crash** nếu `PLUGIN_IDS` có id chưa khai báo trong `DEFAULT` (xem §9 A1).

---

## 4. API ENDPOINTS

### 4.1 Endpoint của chính module

> ❌ **Không có.** Module không gọi API nào: đọc/ghi thuần `localStorage`.

### 4.2 Endpoint liên quan (do module khác cung cấp, admin "tiêu thụ")

| Method + Path | Vai trò trong ngữ cảnh phân quyền | Ghi chú |
| :--- | :--- | :--- |
| `POST /api/auth/loginv1` | Lấy cookie JWT (điều kiện tiên quyết để UI chạy) | Không trả `role` |
| `GET /api/auth/me` | **Nguồn duy nhất của `role`** ⇒ quyết định `can()` có bỏ qua ma trận hay không | Trả `{username, name, role}`; gọi khi login + khi mở lại trang |
| `POST /api/auth/logout` | Không đụng tới `perms_user` ⇒ **quyền vẫn nằm trong localStorage sau khi đăng xuất** | ⚠️ Rủi ro: máy dùng chung, user khác đăng nhập vẫn giữ ma trận admin đã tick |
| `GET /api/{suppliers\|customers\|materials\|material-types\|banks\|accounts}` … | Endpoint được **UI** chặn theo `can('catalog',…)` | ❌ Server **không** biết ma trận ⇒ nếu gọi API trực tiếp (curl/Postman) thì quyền bị bỏ qua |
| `GET/POST/PUT/DELETE /api/inventory/docs…` | Endpoint được **UI** chặn theo `can('inventory',…)` | ❌ Không có annotation bảo vệ nào ⇒ quyền `inventory.*` **hoàn toàn không** được enforce |

### 4.3 "API ngầm" của module

| Kênh | Kiểu | Định dạng dữ liệu |
| :--- | :--- | :--- |
| `localStorage.perms_user` | Lưu trữ | `{ "inventory": {"read":true,"create":true,"update":true,"delete":false}, "catalog": {…} }` |
| `usePermissions()` | In-process reactive | `useSyncExternalStore` + `Set` subscriber; `togglePerm()` ⇒ notify ⇒ `Shell` và mọi plugin render lại |

---

## 5. DATA FLOW

### 5.1 Khởi tạo & hiển thị bảng quyền

```
main.jsx → import './plugins' → registerPlugin(adminPlugin)  (adminOnly ⇒ chỉ hiện với role admin)
Tải trang:
  permissions.js module-eval
    └─ perms = load() = { ...DEFAULT, ...JSON.parse(localStorage.perms_user || '{}') }
         (JSON hỏng ⇒ catch ⇒ trả DEFAULT)
AuthProvider ⇒ GET /api/auth/me ⇒ user = {username, name, role}
Shell:
  ├─ perms = usePermissions()
  ├─ can = (id, action) => role === 'admin' || !!perms[id]?.[action]
  └─ plugins = allPlugins.filter(p => !p.adminOnly || role === 'admin')   ← admin plugin chỉ hiện khi role==='admin'
Rail: bấm 🛡️ Admin ⇒ <active.View/> = AdminView
  └─ render bảng: PLUGIN_IDS.map(id => ACTIONS.map(a => <input type="checkbox" checked={!!perms[id][a]} …/>))
```

### 5.2 Tick / bỏ tick một quyền

```
<input onChange={() => togglePerm(id, a)}>
  └─ permissions.js togglePerm(pluginId, action)
       ├─ perms = { ...perms, [pluginId]: { ...perms[pluginId], [action]: !perms[pluginId][action] } }
       ├─ localStorage.setItem('perms_user', JSON.stringify(perms))
       └─ subs.forEach(f => f())        ⇒ usePermissions() (Shell) + AdminView render lại
Shell.can() tính lại ⇒ ngay lập tức:
   ├─ ẩn/hiện sidebar Menu của plugin (nếu plugin tự kiểm tra read)
   ├─ disable/enable các nút ribbon & nút CRUD trong bảng
   └─ <Denied/> nếu user mất quyền read trong khi đang mở plugin đó? ⇒ CHỈ khi plugin render lại (xem §9 A4)
```

### 5.3 Dùng quyền trong một plugin (ví dụ `inventory`)

```
View(props)   ⇒ if (!props.can('inventory','read')) return <Denied/>
ribbon(...)   ⇒ { id:'new-import', disabled: !can('inventory','create'), … }
ListView      ⇒ const canDelete = can('inventory','delete');  (header checkbox + nút 🗑)
FormView      ⇒ savePerm = isNew ? can('inventory','create') : can('inventory','update')
              ⇒ createPartner = can('catalog','create') ? async (name) => … : undefined
importDocs    ⇒ canCreate = can('catalog','create')  ← tự tạo danh mục khi import
GlobalSearch  ⇒ chỉ tìm trong plugin có can(id,'read')
```

### 5.4 Khi role là `admin`

```
Shell.can(id, action) ⇒ short-circuit TRUE trước khi đọc perms
  ⇒ admin LUÔN thấy mọi plugin (trừ khi plugin tự chặn khác), mọi nút bật, không cần tick gì
  ⇒ Bảng Admin vẫn hiển thị & lưu được, nhưng vô nghĩa với chính admin (theo thiết kế, có ghi chú trong UI)
```

---

## 6. DEPENDENCIES

| Hướng | Thành phần | Ràng buộc |
| :--- | :--- | :--- |
| **Admin phụ thuộc** | `core/permissions.js` | Nguồn dữ liệu duy nhất: `PLUGIN_IDS`, `ACTIONS`, `DEFAULT`, `togglePerm`, `usePermissions` |
| | `plugins/index.js` + `core/plugins.js` | Plugin có `adminOnly: true`; `registerPlugin` nạp `messages`; **thứ tự `order`** (99 ⇒ xuống cuối Rail) |
| | `GET /api/auth/me` → `role` | Chỉ `role === 'admin'` mới thấy module này |
| | i18n | `admin.*` (plugin tự khai) + `perm.denied`, `role.*` (core) |
| | `NAMES` trong `admin/index.jsx` | Phải có key i18n cho **mọi** id trong `PLUGIN_IDS`, nếu không tiêu đề ô đầu bảng sẽ trống |
| **Phụ thuộc vào admin** | `core/Shell.jsx` | `can()` + lọc `adminOnly` — **trung tâm thực thi** của toàn bộ ma trận |
| | `plugins/catalog` (9 call-site) | `read` (View), `create` (nút Thêm/Import/autocomplete tạo loại vật tư), `update` (form), `delete` (nút xoá + bulk) |
| | `plugins/inventory` (≈10 call-site) | `read`, `create` (3 nút tạo phiếu + import), `update` (Lưu khi sửa), `delete` (xoá phiếu/dòng) + `catalog.create` |
| | `core/GlobalSearch.jsx` | Lọc kết quả theo `can(id,'read')` |
| | `plugins/{mail,calendar,people,tasks}` (⏸ bị ẩn) | Vẫn gọi `can(...)` và **vẫn** có tên trong `NAMES`; bật lại cần thêm vào `PLUGIN_IDS` + `DEFAULT` |

---

## 7. SECURITY REQUIREMENTS

> ⚠️ **Nguyên tắc quan trọng nhất:** module này **KHÔNG** phải cơ chế bảo mật. Nó chỉ điều khiển giao diện. Mọi bảo vệ thật phải ở server.

**Vì sao không bảo mật được:**
1. Dữ liệu nằm ở `localStorage` ⇒ người dùng **sửa được bằng DevTools** (`localStorage.setItem('perms_user', JSON.stringify({inventory:{delete:true}}))`).
2. `togglePerm` chạy hoàn toàn ở client, không có API ⇒ không có audit log, không xác thực.
3. `can()` được tính ở client ⇒ có thể bỏ qua bằng cách gọi API trực tiếp (curl/Postman) hoặc chỉnh JS.
4. Ma trận **không** được gửi cho server ở bất kỳ request nào.

**Đang có (giữ nguyên):**
- Plugin `admin` là `adminOnly` ⇒ user role `user` không thấy mục Quản trị trên Rail.
- `admin` luôn full quyền và không thể tự khoá bằng cách tick nhầm.
- `load()` bọc `try/catch` ⇒ JSON hỏng trong localStorage không làm trắng màn hình.
- Các hành động nguy hiểm vẫn có `confirm()` (xoá 1 dòng/nhiều dòng) — độc lập với phân quyền.

**Bắt buộc kiểm tra khi thay đổi:**

- [ ] **Không** dùng `can()` như lớp bảo vệ duy nhất cho dữ liệu nhạy cảm — thêm `@RolesAllowed` ở backend tương ứng.
- [ ] Với mỗi quyền mới, xác định **ai enforce ở server**: hiện `catalog.*` chỉ có `@Authenticated`; `inventory.*` **không có gì** (P0 #1) ⇒ quyền `inventory` tick hay không không ảnh hưởng API.
- [ ] **Không lưu token/mật khẩu** vào object `perms` (đang lưu đúng: chỉ boolean).
- [ ] `localStorage.perms_user` **không** bị xoá khi logout ⇒ máy dùng chung sẽ giữ ma trận của admin. Cân nhắc xoá trong `clearSession()` (hoặc chuyển sang lưu server-side, P2 #32).
- [ ] Nếu chuyển sang lưu server-side: bảng `permissions(role, plugin_id, action)` + `GET/PUT /api/permissions` với `@RolesAllowed("admin")`; `/me` trả kèm ma trận để client không tự đoán.
- [ ] Không dùng phân quyền này để bảo vệ **dữ liệu của từng bản ghi** (hiện chỉ theo plugin, không theo owner/đơn vị).
- [ ] Khi thêm plugin mới: nhớ cập nhật `PLUGIN_IDS` **và** `DEFAULT` **và** `NAMES` — nếu thiếu, xem §9 A1/A2 (crash/không hiện).

---

## 8. COMMON EXTENSION POINTS

| Muốn làm gì | Sửa ở đâu | Ghi chú |
| :--- | :--- | :--- |
| **Thêm plugin vào ma trận** | `core/permissions.js`: thêm id vào `PLUGIN_IDS` **và** object `DEFAULT`; `plugins/admin/index.jsx`: thêm key i18n vào `NAMES` | Bắt buộc làm **đủ 3 bước** (xem §9 A1) |
| **Bật lại plugin legacy** (mail/calendar/people/tasks) | `plugins/index.js`: xoá tên khỏi `SKIPPED_PLUGINS`; `permissions.js`: thêm vào `PLUGIN_IDS` + `DEFAULT` | Tên trong `NAMES` đã có sẵn (`mail.title`, `cal.title`, …) |
| **Thêm action mới** (vd. `approve`, `export`) | `core/permissions.js`: thêm vào `ACTIONS` + `DEFAULT[pluginId]`; i18n `admin.approve`; plugin gọi `can(id,'approve')` | `ACTIONS` là nguồn sinh cột trong bảng Admin |
| **Đổi tên action** (vd. `delete` → `remove`) | Phải sửa **đồng thời**: `ACTIONS`, `DEFAULT`, label `admin.*`, **và mọi call-site `can(id,'delete')`** trong `catalog`/`inventory` | Đổi thiếu 1 nơi ⇒ nút bị vô hiệu vĩnh viễn |
| **Phân quyền chi tiết hơn (theo danh mục)** | Thay key plugin bằng key ghép kiểu `catalog.suppliers`; cập nhật `PLUGIN_IDS`/`DEFAULT`/`NAMES` + call-site | Thay đổi lớn — cần cả `Shell.can` |
| **Phân quyền theo từng user** (không chỉ theo role) | Cần backend: bảng `user_permissions` + `@RolesAllowed`/filter theo user | Hiện `normalizeRole` chỉ có 2 role |
| **Lưu quyền ở server** (việc P2 #32) | Migration `permissions` + `PermissionResource` (`@RolesAllowed("admin")`) + `AuthResource.me` trả kèm ma trận + `permissions.js` chuyển đọc/ghi qua API | Vẫn phải enforce bằng annotation ở từng resource |
| **Ghi log thay đổi quyền** | Thêm API + bảng `permission_audit` | Hiện không có dấu vết ai tick gì, lúc nào |
| **Vô hiệu hoá nhanh theo môi trường** | `permissions.js`: đặt `DEFAULT` cứng (bỏ đọc localStorage) khi build read-only demo | — |
| **Hiển thị mô tả quyền** | `plugins/admin/index.jsx`: thêm cột/tooltip cho từng plugin (dùng i18n) | Hữu ích khi số plugin tăng |
| **Refactor UI bảng** | `plugins/admin/index.jsx` + CSS `.permtable` trong `styles.css` | 35 dòng, dễ tách thành `core/PermissionTable.jsx` nếu tái dùng |

---

## 9. RISKS WHEN MODIFYING

### 🔴 Rủi ro cao

| # | Rủi ro | Nguyên nhân | Cách tránh |
| :- | :--- | :--- | :--- |
| A1 | **Thêm id vào `PLUGIN_IDS` mà quên `DEFAULT` ⇒ TRẮNG MÀN HÌNH** | `AdminView` đọc `perms[id][a]` **không** optional chaining; `perms[id]` là `undefined` ⇒ `TypeError: Cannot read properties of undefined` | Luôn thêm id vào **cả** `PLUGIN_IDS` **và** `DEFAULT` (hoặc đổi UI sang `perms[id]?.[a]`) |
| A2 | **Thêm plugin vào `PLUGIN_IDS` mà quên `NAMES`** | `t(undefined)` ⇒ tiêu đề ô trống (`undefined`) | Thêm key i18n vào `NAMES` + khai báo key đó trong plugin |
| A3 | **Đổi tên action (`delete` → `remove`) mà bỏ sót call-site** | `can(id, 'delete')` ở catalog/inventory và `ACTIONS`/`DEFAULT`/label phải đổi cùng lúc | Grep toàn bộ `can(` trước khi đổi; hoặc giữ tên cũ và thêm alias |
| A4 | **Tick quyền không có hiệu lực tức thời với plugin đang mở** | `Shell` render lại, nhưng plugin đang mount có thể đã lưu giá trị `can()` vào biến/thunk (đặc biệt `ribbon` được gọi lại mỗi render nên **thường** cập nhật; `View` chỉ chặn ở lần mount) | Test bằng cách bật/tắt quyền khi đang mở plugin đó; nếu cần hiệu lực ngay ⇒ dùng state từ `usePermissions()` trong plugin |
| A5 | **Login user khác trên cùng máy vẫn giữ quyền cũ** | `perms_user` không bị xoá khi logout (chỉ xoá `localStorage.user`) | Xoá `perms_user` trong `clearSession()` hoặc khi đổi user |
| A6 | **Coi ma trận là bảo mật** | Là client-side, sửa được bằng DevTools | Thêm `@RolesAllowed` ở backend; coi `can()` chỉ là UX |
| A7 | **`perms[id][action]` trong `togglePerm` khi `perms[id]` chưa có** | `{...undefined}` trả `{}` ⇒ `togglePerm` **không crash** nhưng tạo entry chỉ có 1 action; các action khác vẫn `undefined` (⇒ checkbox false) | Luôn khai báo `DEFAULT` đầy đủ 4 action cho plugin mới |

### 🟠 Rủi ro trung bình

| # | Rủi ro | Nguyên nhân | Cách tránh |
| :- | :--- | :--- | :--- |
| A8 | **`order: 99` không còn là cuối** | Plugin mới có `order` mặc định 100 ⇒ nằm **sau** Admin trên Rail | Đặt `order` phù hợp; `admin` nên là 999 nếu muốn chắc chắn ở cuối |
| A9 | **`localStorage` bị chặn (chế độ riêng tư)** | `load()` đã `try/catch` ⇒ dùng `DEFAULT`; `togglePerm` ghi có thể **throw** (không được bọc) | Bọc `localStorage.setItem` trong try/catch nếu cần chạy ở chế độ chặn |
| A10 | **Hai tab cùng mở** | Mỗi tab giữ `perms` trong bộ nhớ; `storage` event **không** được lắng nghe ⇒ tab kia không cập nhật | Thêm listener `window.addEventListener('storage', …)` nếu cần |
| A11 | **Plugin legacy bật lại nhưng thiếu `DEFAULT`** | Lỗi A1 ngay khi mở trang Admin | Thêm đủ `PLUGIN_IDS` + `DEFAULT` + giữ `NAMES` |
| A12 | **Dữ liệu quyền hỏng/phiên bản cũ** | `load()` merge nông (`{...DEFAULT, ...stored}`) — nếu `stored.inventory` thiếu action thì `undefined` | Chấp nhận (undefined ⇒ false) hoặc merge sâu |
| A13 | **Người dùng hiểu nhầm "đã phân quyền là an toàn"** | UI có ghi chú nhưng không nổi bật | Ghi chú trong tài liệu (đã có §7) + tooltip trên bảng |

### 🟡 Lưu ý phạm vi

- Module này **không có backend** ⇒ không có gì để "sửa ở server" khi chỉ đổi UI; ngược lại, đừng tìm `permissions` trong `src/main/java` (không tồn tại).
- `plugins/{mail,calendar,people,tasks}` **bị ẩn** bởi `SKIPPED_PLUGINS` nhưng **vẫn có tên** trong `NAMES` ⇒ bảng Admin hiện 4 dòng "vô dụng" với user role `user` (vì plugin không tồn tại trên Rail). Đây là dấu vết thiết kế, không phải lỗi.
- `PLUGIN_IDS` hiện là `['inventory','catalog']` (2 dòng), còn 4 dòng legacy trong `NAMES` **không** nằm trong `PLUGIN_IDS` ⇒ chúng **không** hiện trên bảng.
- Nếu xoá `core/permissions.js` hoặc `togglePerm`: mọi plugin sẽ **mất** khả năng chặn UI ⇒ phải sửa `Shell.can` và ~20 call-site.




