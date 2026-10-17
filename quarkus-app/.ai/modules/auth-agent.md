# auth-agent.md — Module XÁC THỰC (Authentication & Session)

> **Module key:** *(không phải plugin)* — nằm trong `core/`, chạy từ `main.jsx`
> **Backend route gốc:** `/api/auth/**` · **Bảng DB:** `users`
> **Trạng thái:** ✅ hoạt động (~90%) · **Cập nhật:** 16/10/2026 · **Phiên bản:** `1.0.0-SNAPSHOT`
> **Đọc trước:** [`PROJECT_GUIDE.md`](../../PROJECT_GUIDE.md) §2.5 (luồng JWT), §3.7 (i18n/permission), §6.3 (checklist bảo mật), §7.1 (P0 #3, #4, #5, #6)
> **Tài liệu liên quan:** [`COMPONENT_MAPPING.md`](../../COMPONENT_MAPPING.md) §1.7, §3.3, §4.1

---

## 1. PURPOSE — Mục đích

Cung cấp **xác thực và quản lý phiên đăng nhập** cho toàn bộ ứng dụng:

1. Xác thực `username`/`password` bằng **BCrypt** đối chiếu bảng `users`.
2. Phát hành **JWT (RSA-2048)** và gắn vào **HttpOnly cookie `token`** — JS **không** đọc/ghi được (chống XSS đánh cắp token).
3. Trả **thông tin người đang đăng nhập** (`username`, `name`, `role`) cho UI để ẩn/hiện menu và nút.
4. Kết thúc phiên: server xoá cookie (`maxAge=0`), client xoá cache `localStorage.user`.
5. Tự đưa người dùng về màn hình đăng nhập khi bất kỳ request `apiFetch` nào trả **401**.
6. Cấp **role** (`admin` | `user`) — nền tảng cho module `admin` (phân quyền) và cho mọi `@RolesAllowed` ở backend.

**KHÔNG thuộc module này:** ma trận quyền CRUD theo plugin (⇒ `admin-agent.md`), quản trị danh sách user (chưa có chức năng).

---

## 2. BACKEND FILES

| File | Vai trò | Chi tiết cần biết |
| :--- | :--- | :--- |
| `src/main/java/com/ketoan/resource/AuthResource.java` | **Endpoint duy nhất** của module (`@Path("/auth")`) | `register`, `login` (legacy), `loginv1` (cookie), `me`, `logout`; inject `JsonWebToken jwt` + `AuthService`; method `unauthorized(String)` **không dùng** |
| `src/main/java/com/ketoan/service/AuthService.java` | Nghiệp vụ xác thực (`@ApplicationScoped`) | Hằng số `ISSUER = "https://vinhcancode.local"`, `TOKEN_TTL_SECONDS = 86400`; `login()` (legacy — trả UUID **không phải JWT**), `generateToken()` (JWT thật), `register()`, `normalizeRole()` (role lạ ⇒ `user`) |
| `src/main/java/com/ketoan/entity/User.java` | Entity `users` (`PanacheEntityBase`) | `id(Long, IDENTITY)`, `username`, `password` (BCrypt), `role`; static `User.findByUsername(String)`; field `token`/`findByToken` đã bị **comment bỏ** |
| `src/main/java/com/ketoan/dto/AuthRequest.java` | DTO vào | `{ public String username; public String password; }` — **không validate** |
| `src/main/java/com/ketoan/dto/AuthResponse.java` | DTO ra | `{ public String token; }` — chỉ dùng cho `login()` legacy |
| `src/main/java/com/ketoan/config/SecurityFilter.java` | `@Provider` JAX-RS filter (`@Priority(AUTHENTICATION)`) | Chỉ `System.out.println` path + kiểm tra **cookie có tồn tại**; bỏ qua path chứa `auth`/`public`; phần verify token đã **comment**. ⚠️ nhiễu log — xem §9 |
| `src/main/java/com/ketoan/config/RestApplication.java` | `@ApplicationPath("/api")` | Quyết định tiền tố `/api` cho mọi route, gồm `/api/auth/*` |
| `src/main/java/com/ketoan/model/User.java` | ⚠️ **code chết** (POJO trùng tên `entity.User`) | Không file nào import `com.ketoan.model` — ứng viên xoá |
| `src/main/resources/db/migration/V00001__init.sql` | Tạo `users(id, username)` | — |
| `src/main/resources/db/migration/V00002__add_password_and_role_to_users.sql` | `+ password`, `+ role` | Seed `admin`, `user1`, `vinhtran` = BCrypt của `123`; cột `role` mặc định `'USER'` (chữ HOA ⇒ được `normalizeRole()` hạ về `user`) |
| `src/main/resources/application.properties` | Cấu hình JWT | `smallrye.jwt.sign.key.location=privateKey.pem`, `mp.jwt.verify.publickey.location=publicKey.pem`, `mp.jwt.verify.issuer=https://vinhcancode.local`, `mp.jwt.token.header=Cookie`, `mp.jwt.token.cookie=token`, `quarkus.http.auth.proactive=false`, `quarkus.security.deny-unannotated-for-microprofile-jwt=false` |
| `src/main/resources/` — `privateKey.pem`, `publicKey.pem`, `rsaPrivateKey.pem`, `secretKey.jwk` | Khoá ký/verify | Đã bị `.gitignore` — chỉ commit bản `*-sample`. Native build cần `quarkus.native.resources.includes=publicKey.pem,privateKey.pem` |
| `pom.xml` | Dependency | `quarkus-smallrye-jwt`, `quarkus-smallrye-jwt-build` (class `Jwt`), `quarkus-security-jpa` (kèm Elytron ⇒ `io.quarkus.elytron.security.common.BcryptUtil`), `quarkus-arc`, `quarkus-rest-jackson` |
| `src/test/java/com/ketoan/DanhMucTaiKhoanResourceTest.java` | ⚠️ test **lỗi thời** | Gọi `/danhmuc` (không tồn tại) ⇒ luôn fail; ứng viên thay bằng test cho auth |

---

## 3. FRONTEND FILES

| File | Vai trò | Chi tiết cần biết |
| :--- | :--- | :--- |
| `src/main/webui/src/core/api.js` | **HTTP client của module auth** (GlobalSearch cũng dùng) | `API_BASE = import.meta.env.VITE_API_BASE ?? ''`; `apiFetch(path, {method, body, headers, silent401, ...rest})` có `credentials:'include'`; `ApiError(status, message, data)`; `setUnauthorizedHandler(fn)`; phát hiện server trả HTML thay JSON; `useApi(fetcher, deps)`; `fakeApi()` (chỉ plugin legacy dùng) |
| `src/main/webui/src/core/auth.jsx` | **Context phiên đăng nhập** | `AUTH = { login:'/api/auth/loginv1', me:'/api/auth/me', logout:'/api/auth/logout' }`; `KEY='user'` (cache `localStorage`); `TEMP_ROLES` ⚠️ còn sót dù `/me` đã có; `readCached()`, `toInfo(d)`, `AuthProvider`, `login()`, `logout()`, `clearSession()`; gọi `/me` khi mở lại trang để kiểm tra cookie |
| `src/main/webui/src/core/Login.jsx` | Màn hình đăng nhập | state `u` (mặc định `'admin'`), `p`, `err`, `busy`; chặn double-submit; 401/403 ⇒ `t('login.error')`, lỗi khác hiện `ex.message` |
| `src/main/webui/src/core/http.js` | HTTP client cho store/nghiệp vụ | `BASE = VITE_API_URL ?? '/api'`; gắn `Authorization: Bearer` từ `localStorage.token` ⚠️ **thừa** với cơ chế cookie; `configureHttp()` **chưa từng được gọi** ⇒ `onUnauthorized` của nó là no-op (401 từ store **không** tự logout) |
| `src/main/webui/src/main.jsx` | Gate điều hướng | `const Gate = () => (useAuth().user ? <Shell/> : <Login/>)`; bọc `I18nProvider > ConfirmProvider > AuthProvider` |
| `src/main/webui/src/core/Shell.jsx` | Hiển thị phiên | `rolebadge` (`t('role.'+role)`), avatar theo `user.name ?? user.username`; nút đăng xuất nằm ở Ribbon tab **Tệp** |
| `src/main/webui/src/core/ribbon.jsx` | Nút đăng xuất dùng chung | `commonTabs({ logout, ... })` ⇒ tab `file` / group `account` / item `logout` |
| `src/main/webui/src/core/i18n.jsx` | Chuỗi dùng chung | `app.name`, `logout`, `login.title/user/pass/submit/error/hint`, `role.admin`, `role.user`, `perm.denied` |
| `src/main/webui/src/core/Denied.jsx` | UI khi thiếu quyền | Hiện `🔒 perm.denied` |
| `src/main/webui/src/core/masterdata.js` | Bộ đệm dữ liệu danh mục | `resetAllStores()` — **chưa được gọi trong `logout()`** ⚠️ (xem §9) |
| `src/main/webui/.env.local-sample` | Cấu hình dev | `VITE_USE_REAL_API=true` (phải khởi động lại Vite sau khi đổi) |
| `src/main/webui-v1/src/components/Login.jsx`, `src/main/webui-v1/src/services/api.js` | ⚠️ **bản thử nghiệm — KHÔNG dùng** | Login giả với `DUMMY_USERS` (`admin/123`), lưu `localStorage.auth_token`; không liên quan ứng dụng thật |
| `src/main/webui/index.html`, `vite.config.js` | Vỏ SPA | Tên app "PM Ketoan"; Vite chỉ có plugin react ⇒ mọi request `/api` phải qua Quinoa proxy (cùng origin) |

---

## 4. API ENDPOINTS

Base: `/api` (từ `@ApplicationPath("/api")` + `@Path("/auth")`).

| Method + Path | Request | Response | Auth | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| `POST /api/auth/loginv1` | `{ "username": "...", "password": "..." }` | `200` + `{"message":"Đăng nhập thành công"}` + **Set-Cookie `token`** | public | **Endpoint đang dùng.** Cookie: `HttpOnly`, `Path=/`, `SameSite=Lax`, `Max-Age=86400`, `Secure=false` |
| `POST /api/auth/me` → `GET /api/auth/me` | — (JWT đọc từ cookie) | `200` + `{ "username": "...", "name": "...", "role": "admin"\|"user" }` | `@RolesAllowed({"admin","user"})` | JWT đọc qua `jwt.getName()` (claim `upn`), `jwt.getClaim("name")`, `jwt.getGroups()` |
| `POST /api/auth/logout` | — | `200` + `{"message":"Đăng xuất thành công"}` + cookie `token` rỗng, `Max-Age=0` | public | Client luôn xoá session dù server lỗi |
| `POST /api/auth/register` | `{username, password}` | `201` + **entity `User`** (⚠️ kèm `password` hash) | public | Trùng username ⇒ `400 {"error":"Username đã tồn tại trong hệ thống!"}`; role luôn gán `"USER"` |
| `POST /api/auth/login` | `{username, password}` | `200` + `{"token":"<UUID>"}` | public | ⚠️ **legacy/hỏng**: trả UUID không phải JWT, không có nơi nào dùng |
| `GET /api/public/hello` | — | `200` + `"Hello there"` (text) | public | Ở `HelloResource`, dùng để smoke-test; `SecurityFilter` bỏ qua path chứa `public` |

**Mã lỗi & body:**

| HTTP | Tình huống | Body |
| :--- | :--- | :--- |
| `401` | Sai username/password (từ `AuthService`) | `{"error":"Tên đăng nhập hoặc mật khẩu không đúng!"}` |
| `400` | Username đã tồn tại (register) | `{"error":"Username đã tồn tại trong hệ thống!"}` |
| `401` | Cookie thiếu/hết hạn/chữ ký sai ở endpoint có `@Authenticated`/`@RolesAllowed` | do Quarkus sinh (không phải JSON chuẩn `{message}`) |
| `400` | Body không parse được / thiếu field | do Quarkus/Jackson sinh |

> ⚠️ Auth dùng `{"error": ...}` trong khi danh mục/kho dùng `{"message": ...}` — FE đã đọc cả hai (`data?.message ?? data?.error`), nhưng **code mới nên trả `message`** ([`PROJECT_GUIDE.md`](../../PROJECT_GUIDE.md) §5.2).

---

## 5. DATA FLOW

### 5.1 Đăng nhập

```
Login.jsx submit(u, p)
  └─ auth.jsx login(u, p)
       ├─ apiFetch('/api/auth/loginv1', POST {username,password}, silent401:true)
       │     └─ AuthResource.loginv1 → AuthService.generateToken()
       │           ├─ User.findByUsername(username)              [Panache → users]
       │           ├─ BcryptUtil.matches(p, user.password)       ── sai ⇒ throw 401
       │           └─ Jwt.issuer(ISSUER).subject(upn).groups(role)
       │                  .claim("name", …).expiresIn(86400).sign()   [privateKey.pem]
       │     ⇐ Set-Cookie: token=…; HttpOnly; SameSite=Lax
       ├─ apiFetch('/api/auth/me', silent401:true)
       │     └─ AuthResource.me → đọc JsonWebToken từ cookie ⇒ {username, name, role}
       │           └─ nếu 404/405 (chưa có /me) ⇒ dùng TEMP_ROLES (fallback cũ)
       └─ persist({username, name, role})  ⇒ localStorage.user + setState  ⇒ Shell render
```

### 5.2 Kiểm tra phiên khi mở lại trang (F5)

```
AuthProvider mount
  ├─ user = readCached()  (localStorage.user)  ⇒ hiện Shell ngay (không nháy màn hình login)
  └─ nếu có user: GET /api/auth/me (silent401)
        ├─ 200 ⇒ cập nhật lại {username,name,role} (đồng bộ role mới nhất)
        ├─ 401 ⇒ clearSession()  ⇒ về Login
        └─ lỗi mạng / 404 ⇒ giữ nguyên cache (request sau sẽ phát hiện)
```

### 5.3 Hết phiên giữa chừng (401)

```
Bất kỳ apiFetch nào (AuthProvider đã đăng ký handler)
  ⇐ 401  ⇒ apiFetch gọi onUnauthorized()  ⇒ clearSession()
        ├─ localStorage.removeItem('user')
        ├─ setUser(null)          ⇒ Gate render <Login/>
        └─ history.replaceState(pathname)   ⇒ xoá state plugin trên URL hash
```
> Lưu ý: handler này **chỉ** gắn cho `apiFetch` (`core/api.js`). `http.js` (store danh mục, `inventoryApi`) có `configureHttp()` nhưng **không được gọi ở đâu** ⇒ 401 từ các client đó chỉ hiện banner lỗi, không tự logout.

### 5.4 Đăng xuất

```
Ribbon (tab Tệp ▸ Tài khoản ▸ Đăng xuất) → useAuth().logout()
  ├─ POST /api/auth/logout  (try/catch — bỏ qua lỗi)
  │     └─ AuthResource.logout ⇒ Set-Cookie token="" ; Max-Age=0
  └─ clearSession()  ⇒ localStorage.rm('user') + setUser(null) + xoá hash
```

### 5.5 Đăng ký

```
POST /api/auth/register
  └─ AuthService.register()  @Transactional
       ├─ User.findByUsername ≠ null ⇒ 400
       ├─ new User{username, password: BcryptUtil.bcryptHash(raw), role:"USER"}
       └─ persist()  ⇒ 201 + entity (⚠️ có cả field password)
     (Không tự đăng nhập — người dùng phải gọi /loginv1)
```

---

## 6. DEPENDENCIES

| Hướng | Thành phần | Vì sao ràng buộc |
| :--- | :--- | :--- |
| **Auth phụ thuộc** | Quarkus SmallRye JWT + `privateKey.pem`/`publicKey.pem` | Ký/verify; thiếu hoặc sai cặp khoá ⇒ `sign()` lỗi lúc login, hoặc mọi `@Authenticated` trả 401 |
| | `mp.jwt.verify.issuer` = `AuthService.ISSUER` | **Phải trùng nhau** — lệch ⇒ token bị từ chối (401) dù login thành công |
| | `mp.jwt.token.header=Cookie` + `mp.jwt.token.cookie=token` | Đổi tên cookie ⇒ phải đổi cả `logout` (và nhớ rằng FE không đọc được cookie) |
| | `quarkus.http.auth.proactive=false` | Cần thiết để `/loginv1` không bị chặn trước khi vào method |
| | Bảng `users` + migration `V00001`,`V00002` | Thiếu cột `role` ⇒ `normalizeRole(null)` ⇒ mọi user thành `user`, mất quyền admin |
| | `quarkus-security-jpa` (Elytron) | Cung cấp `BcryptUtil` — xoá dependency này làm `AuthService` **không compile** |
| **Phụ thuộc vào auth** | Mọi endpoint có `@Authenticated` (`MasterResource` ⇒ 6 danh mục) | 401 ⇒ FE `clearSession()` về Login |
| | `Shell.jsx` (`user.role`, `logout`), `Login.jsx`, `main.jsx` Gate | Toàn bộ UI sau đăng nhập |
| | `plugins/admin/index.jsx` + `core/permissions.js` | `can()` = `role === 'admin' || perms[...]` — role lấy từ `/me` |
| | `plugins/catalog`, `plugins/inventory` | Nút/CRUD bị disable theo `can()`; API trả 401 khi hết phiên |
| | `core/GlobalSearch.jsx` | Lọc plugin theo `can(p.id,'read')` |

---

## 7. SECURITY REQUIREMENTS

**Đang có (giữ nguyên khi sửa):**
- Token **chỉ** nằm trong HttpOnly cookie; JS không đọc được ⇒ chống XSS lấy token.
- `sameSite=LAX` ⇒ giảm rủi ro CSRF cho request điều hướng từ site khác.
- Mật khẩu băm BCrypt; so sánh bằng `BcryptUtil.matches` (không so chuỗi thô).
- JWT stateless: không lưu token trong DB ⇒ logout = xoá cookie (không có cơ chế thu hồi phía server).
- `normalizeRole()` chặn leo thang role từ dữ liệu bẩn (`ROLE_ADMIN`/`ADMIN` ⇒ `admin`, còn lại ⇒ `user`).
- Bí mật (`*.pem`, `secretKey.jwk`) đã bị `.gitignore`; native build khai báo `resources.includes`.

**Bắt buộc kiểm tra khi thay đổi:**

- [ ] **HTTPS/production:** đổi `secure(true)` cho cookie ở `loginv1` **và** `logout`; cân nhắc `SameSite=Strict`.
- [ ] **Không** trả `User` entity ra ngoài (đang rò rỉ `password` hash ở `/register`) ⇒ dùng DTO/`@JsonIgnore`.
- [ ] **Không** thêm endpoint `public` mới mà quên `@Authenticated` (vì `quarkus.http.auth.permission.public-ui.paths=/*` đang **permit** tất cả ở tầng policy).
- [ ] `SecurityFilter` **không phải** lớp bảo vệ: nó chỉ kiểm tra cookie **tồn tại**, không verify chữ ký ⇒ đừng gỡ `@Authenticated`/`@RolesAllowed` vì "đã có filter".
- [ ] Không bật `/auth/register` ở production nếu không kiểm soát (hiện public, tạo user role `USER` không giới hạn).
- [ ] Khi thêm claim mới: giữ `groups` (vì `me()` phụ thuộc `jwt.getGroups()`) và `upn`/`sub` (vì `jwt.getName()`).
- [ ] Cookie `Path=/` là **cố ý** (dùng cho cả SPA lẫn API) — thu hẹp path sẽ làm hỏng phiên.
- [ ] Không log token/mật khẩu (hiện `SecurityFilter` log mọi path ra stdout ⇒ dọn về `Logger` + DEBUG).
- [ ] Giữ RSA-2048; **không** hạ xuống HS256 kèm khoá nằm trong repo.

---

## 8. COMMON EXTENSION POINTS

| Muốn làm gì | Sửa ở đâu | Lưu ý |
| :--- | :--- | :--- |
| Giới hạn ghi dữ liệu cho admin | `MasterResource` (annotation) / lớp con | `@RolesAllowed("admin")` trên `create/update/delete`; role phải là `admin` **chữ thường** (khớp `normalizeRole`) |
| Thêm role mới (vd. `accountant`) | `AuthService.normalizeRole()` + `AuthResource.me` (đang hard-code 2 role) + `core/permissions.js` + i18n `role.*` + `Shell.can()` | Role mới cần sửa **cả 2 phía** |
| Thêm claim vào JWT (email, họ tên, mã NV…) | `AuthService.generateToken()` (`.claim(...)`) + `AuthResource.me` (đọc ra) | FE chỉ nhận những gì `me()` trả — FE **không** đọc JWT trực tiếp |
| Đổi TTL phiên | `AuthService.TOKEN_TTL_SECONDS` **và** `maxAge` của cookie (`AuthResource`) | Hai giá trị phải khớp, nếu không cookie/token lệch vòng đời |
| Refresh token / sliding session | `AuthResource` + `AuthService` + `core/auth.jsx` | Nên dùng cookie thứ hai (`refreshToken`) cùng `HttpOnly` |
| Đổi mật khẩu | Thêm `POST /auth/change-password` + method trong `AuthService` (verify cũ ⇒ hash mới) | Phải `@Authenticated`; lấy username từ `jwt`, **không** tin body |
| Quản trị user (list/khoá/reset pass) | Tạo `UserResource` mới `@Path("/users")` + `@RolesAllowed("admin")` | Có thể tái dùng `MasterResource` nếu loại field `password` khỏi JSON |
| Thu hồi phiên mọi thiết bị | Không có sẵn (stateless) | Cần bảng `revoked_tokens` / `users.token_version` + kiểm tra trong filter |
| SSO / OIDC | `application.properties` (`quarkus.oidc.*`) + thay `AuthService` | Thay đổi lớn — cập nhật cả 4 file trong `.ai/modules/` |
| Đổi nguồn dữ liệu FE sang mock | `webui/.env.local` (`VITE_USE_REAL_API`) | Chỉ ảnh hưởng danh mục/kho, **không** ảnh hưởng `/api/auth/*` (luôn gọi thật) |

---

## 9. RISKS WHEN MODIFYING

### 🔴 Rủi ro cao (có thể làm hỏng toàn bộ đăng nhập)

| # | Rủi ro | Nguyên nhân | Cách tránh |
| :- | :--- | :--- | :--- |
| A1 | **Đổi `ISSUER` mà quên `mp.jwt.verify.issuer`** (hoặc ngược lại) | Cấu hình trùng lặp: `AuthService.ISSUER` vs `application.properties` | Sửa **cả hai** cùng lúc; tốt nhất đưa về `@ConfigProperty` |
| A2 | **Đổi tên claim `upn`/`sub`/`groups`** | `AuthResource.me` đọc `jwt.getName()`, `getClaim("name")`, `getGroups()` | Giữ nguyên claim cũ; thêm claim mới bằng tên khác |
| A3 | **Đổi tên cookie `token`** | 3 nơi: `application.properties` (`mp.jwt.token.cookie`), `loginv1`, `logout` | Sửa đồng bộ; giai đoạn chuyển tiếp phải xoá cả tên cũ lẫn mới |
| A4 | **Đổi `password` → `passwordHash`** (hoặc thêm field) trong `User` | `AuthService` dùng `user.password`; cột DB `password` NOT NULL | Đổi entity + 2 method + migration `V0000X` (không sửa `V00002`) |
| A5 | **Bỏ `credentials:'include'`** | Cookie không được gửi ⇒ login "thành công" nhưng `/me` 401 | Giữ ở **cả** `core/api.js` và `core/http.js`; không dùng `SameSite=None` khi chạy HTTP |
| A6 | **Xoá `TEMP_ROLES`/fallback khi chưa kiểm thử** | Nếu xoá **và** `/me` lỗi ⇒ login fail cứng (không còn role) | Xoá rồi kiểm chứng: login ⇒ `role` phải đúng từ server |
| A7 | **Gọi `/auth/register` ở production** | Endpoint public, không giới hạn role/rate | Thêm `@RolesAllowed("admin")` hoặc tắt theo profile |

### 🟠 Rủi ro trung bình (hành vi lệch âm thầm)

| # | Rủi ro | Nguyên nhân | Cách tránh |
| :- | :--- | :--- | :--- |
| A8 | **Logout không xoá dữ liệu danh mục/kho** | `logout()` chỉ xoá `localStorage.user`; `resetAllStores()` tồn tại nhưng không được gọi; state module kho (`st.docs`) cũng không reset | Gọi `resetAllStores()` + thêm `resetDocs()` trong `logout()` (guide §7.2 #23) |
| A9 | **401 từ store không tự logout** | `configureHttp()` trong `http.js` chưa từng được gọi ⇒ `onUnauthorized` là no-op | Gọi `configureHttp({ onUnauthorized: clearSession })` trong `AuthProvider` |
| A10 | **Role "cũ" hiển thị sai** | `/me` chỉ gọi **một lần** khi mount; đổi role trong DB không tự cập nhật | Reload trang hoặc gọi lại `/me` khi focus/định kỳ |
| A11 | **Lỗi login mơ hồ khi server trả HTML** | Vite trả `index.html` (200) khi `/api` chưa được proxy | Giữ nguyên logic phát hiện `text/html` trong `apiFetch` khi refactor |
| A12 | **`SecurityFilter` bỏ qua path chứa `auth`/`public`** | `cleanPath.contains("auth")` sẽ khớp cả resource tên kiểu `/api/authorization…` | Khi thêm Resource mới tránh tên chứa `auth`/`public`, hoặc sửa filter so khớp tiền tố chính xác |
| A13 | **NPE khi `username`/`password` null** | `AuthRequest` không validate, `BcryptUtil.matches(null, …)` | Validate `blank` ⇒ 400 (guide §7.3 #37) |
| A14 | **Đổi shape của `me()`** | `toInfo(d)` map cứng `username/name/role` | Sửa `toInfo` cùng lúc; giữ fallback `d.name ?? d.username` |
| A15 | **`SecurityFilter` log stdout mỗi request** | `System.out.println` — tồn tại cả ở prod | Chuyển sang `Logger` level DEBUG |

### 🟡 Lưu ý phạm vi (không phải lỗi, nhưng dễ sửa nhầm)

- `AuthResponse` + `AuthService.login()` là **code chết** — đừng dùng làm chuẩn cho endpoint mới; JWT thật ở `loginv1`.
- `com.ketoan.model.User` là **code chết** trùng tên `entity.User` ⇒ grep `User` ra 2 kết quả, đừng sửa nhầm.
- `webui-v1` có luồng login **hoàn toàn khác** (`localStorage.auth_token`, user giả `DUMMY_USERS`) — không phải chuẩn của dự án.
- Test hiện có (`DanhMucTaiKhoanResourceTest`) không kiểm tra auth. Khi thêm test: dùng `RestAssured` gọi `/api/auth/loginv1` rồi `cookie("token", …)` để gọi các endpoint được bảo vệ.




