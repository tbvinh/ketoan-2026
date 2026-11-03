# PROJECT_GUIDE.md — Kiến trúc & Quy ước Dự án KẾ TOÁN 2026

> **Module Maven:** `com.ketoan:quarkus-app:1.0.0-SNAPSHOT`
> **Cập nhật:** 16/10/2026 · **Người phân tích:** Cline (prompt `01-analyze-project.md`)
> **Phạm vi:** Toàn bộ mã nguồn backend (`src/main/java`) + frontend (`src/main/webui`, `src/main/webui-v1`) + DB migrations.
> **Tài liệu liên quan:** [`COMPONENT_MAPPING.md`](./COMPONENT_MAPPING.md) (ánh xạ từng component), [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) (tiến độ), [`CHANGELOG.md`](./CHANGELOG.md), [`.ai/.clinerules`](./.ai/.clinerules).

> [!WARNING]
> **Đọc trước khi sinh code:** các file `.ai/prompts/01,02,05,06,08` giả định stack là *Spring Boot + Controller/Service/Repository + MapStruct + Axios + React Router*. **Stack THỰC TẾ của repo khác hoàn toàn:**
>
> | Prompt giả định | Thực tế trong repo |
> | :--- | :--- |
> | Spring Boot | **Quarkus 3.39.3** (RESTEasy Reactive, Jakarta REST) |
> | Repository layer (`CustomerRepository`) | **Không có** — dùng `EntityManager` / Panache static API |
> | MapStruct | **Không có** — Jackson `ObjectMapper.convertValue/updateValue` |
> | Axios | **Không có** — `fetch` bọc trong `core/http.js` / `core/api.js` |
> | React Router | **Không có** — hash-router tự viết (`core/router.js`) |
> | `*.jsx` Page + Component | **Plugin contract** (`id/title/icon/View/Menu/ribbon`) đăng ký động |
>
> Tài liệu này mô tả **đúng hiện trạng** để các prompt sau không sinh code sai kiến trúc.

---

## MỤC LỤC

1. [Project Overview](#1-project-overview--tổng-quan-dự-án)
2. [Backend Architecture](#2-backend-architecture--kiến-trúc-backend)
3. [Frontend Architecture](#3-frontend-architecture--kiến-trúc-frontend)
4. [Module Map](#4-module-map--bản-đồ-phân-hệ)
5. [Naming Conventions](#5-naming-conventions--quy-ước-đặt-tên)
6. [Coding Standards](#6-coding-standards--quy-chuẩn-coding)
7. [Recommendations](#7-recommendations--khuyến-nghị)

---

## 1. PROJECT OVERVIEW — TỔNG QUAN DỰ ÁN

### 1.1 Mục tiêu

Ứng dụng **kế toán – quản trị nội bộ** (mô phỏng giao diện Office 365/Ribbon) gồm 2 nghiệp vụ đã hoạt động:

1. **Danh mục (Master Data):** Nhà cung cấp, Khách hàng, Vật tư, Loại vật tư, Ngân hàng, Tài khoản kế toán — CRUD + tìm kiếm/lọc/sắp xếp/phân trang + xoá hàng loạt + Import/Template CSV.
2. **Kho (Inventory):** Phiếu nhập (`PN`) / xuất (`PX`) / trả (`PT`) dạng **Master–Detail**, kéo thả đổi thứ tự dòng, tính thành tiền, Import CSV.

Kèm theo: xác thực JWT bằng **HttpOnly Cookie**, phân quyền CRUD theo vai trò, đa ngôn ngữ Việt–Anh, Global Search, Ribbon đa tab, History navigation.

### 1.2 Kiến trúc vật lý

Đây là **monolith Quarkus "fat jar" + SPA nhúng** (không phải multi-module, không phải microservice):

```
quarkus-app/                          ← 1 repo = 1 artifact
├── pom.xml                           ← Quarkus BOM 3.39.3, Java 21, uber-jar
├── Dockerfile / Dockerfile-debug     ← build 2 stage (maven → temurin-jre 21)
├── src/main/java/com/ketoan/         ← BACKEND (REST + business + JPA)
├── src/main/resources/               ← application.properties, db/migration (Flyway), *.pem
├── src/main/webui/                   ← FRONTEND ĐANG DÙNG (React 18 + Vite 5) — Quinoa
├── src/main/webui-v1/                ← FRONTEND THỬ NGHIỆM (React 19 + Fluent UI) — KHÔNG được Quinoa build
├── src/test/java/                    ← Test (hiện đang lỗi thời, xem §7)
├── sql/sql-0001.sql                  ← Script SQL tham chiếu ngoài Flyway
├── .ai/                              ← Cline rules + prompts + guide
└── COMPONENT_MAPPING.md / PROJECT_STATUS.md / CHANGELOG.md / README.md
```

### 1.3 Tech stack thực tế

| Tầng | Công nghệ | Bằng chứng |
| :--- | :--- | :--- |
| Runtime | Java 21 (`maven.compiler.release=21`), Quarkus **3.39.3** | `pom.xml` |
| REST | `quarkus-rest-jackson` (RESTEasy Reactive), Jakarta REST `@Path/@GET/@POST…` | `MasterResource.java` |
| DI | `quarkus-arc` (`@Inject`, `@ApplicationScoped`) | `AuthService.java` |
| ORM | Hibernate ORM **Panache** (`PanacheEntityBase` + static `find/listAll/count `) & `EntityManager` | `InvDoc.java`, `MasterResource.java` |
| DB | PostgreSQL 15 (Docker), pool Agroal (min 2 / max 10) | `application.properties` |
| Migration | Flyway `V00001…V00005`, `migrate-at-start=true`, Hibernate `generation=none` | `db/migration/` |
| Security | SmallRye JWT (RSA-2048 ký bằng `privateKey.pem`), cookie `token`, BCrypt (`BcryptUtil`) | `AuthService.java` |
| Frontend | **React 18.3.1** + **Vite 5.4** + `@vitejs/plugin-react`; **không** thư viện UI ngoài (CSS thuần) | `webui/package.json` |
| FE↔BE | **Quarkus Quinoa 2.9.0** (dev-server port 5173, `build-dir=dist`, `enable-spa-routing`) | `application.properties` |
| i18n | Từ điển tự viết (`dict.vi/en` + `addMessages`) | `core/i18n.jsx` |
| Test | JUnit 5 + RestAssured (`quarkus-junit5`) — **`skipTests=true` trong pom** | `pom.xml` |

### 1.4 Chạy dự án (theo `README.md`)

```shell
# 1. Hạ tầng
docker compose up -d postgres        # PostgreSQL localhost:5432/ke_toan (user: laravel/secret)
docker compose up -d pgadmin

# 2. Chuẩn bị bí mật & env (copy từ file mẫu, KHÔNG commit)
#    src/main/resources/*pem-sample  ->  *.pem
#    src/main/webui/.env.local-sample -> .env.local           (VITE_USE_REAL_API=true)

# 3. Dev mode (Quinoa tự start Vite ở :5173; app ở :8080, Dev UI ở /q/dev)
./mvnw compile quarkus:dev

# 4. Reset DB hoàn toàn (Flyway clean rồi migrate lại)
quarkus_flyway_clean_at_start=true ./mvnw clean compile quarkus:dev

# 5. Đóng gói
./mvnw package                       # -> target/quarkus-app/quarkus-run.jar (hoặc uber-jar)
java -jar target/quarkus-app/quarkus-run.jar
```

**Biến môi trường / cấu hình quan trọng** (`.env`, `application.properties`):

| Biến | Mặc định | Ý nghĩa |
| :--- | :--- | :--- |
| `QUARKUS_DATASOURCE_JDBC_URL` | `jdbc:postgresql://localhost:5432/ke_toan` | Kết nối DB |
| `QUARKUS_DATASOURCE_USERNAME/PASSWORD` | `laravel` / `secret` | Tài khoản DB |
| `quarkus.http.port` | `8080` | Cổng app (Quinoa serve cả SPA + API cùng origin → **không cần CORS ở production**) |
| `quarkus.quinoa.dev-server.port` | `5173` | Cổng Vite khi dev |
| `mp.jwt.token.header` / `.cookie` | `Cookie` / `token` | JWT **đọc từ Cookie**, không từ header `Authorization` |
| `quarkus.http.auth.proactive` | `false` | Chỉ xác thực endpoint có annotation (tránh chặn `/auth/loginv1`) |
| `VITE_USE_REAL_API` | *(không đặt → false)* | `true` = dùng REST thật; `false` = mock store trong bộ nhớ |
| `VITE_API_BASE` | `''` (same-origin) | Chỉ đặt khi backend khác origin |
| `VITE_API_URL` | `/api` | Base path cho `core/http.js` |

### 1.5 Trách nhiệm từng thư mục

| Đường dẫn | Trách nhiệm | Ghi chú |
| :--- | :--- | :--- |
| `src/main/java/com/ketoan/resource` | **Tầng HTTP**: nhận request, validate đầu vào, phân trang/lọc/sắp xếp, trả JSON | Tương đương "Controller" |
| `src/main/java/com/ketoan/service` | **Tầng nghiệp vụ** dùng chung & có transaction | Hiện chỉ có `AuthService` |
| `src/main/java/com/ketoan/entity` | **JPA Entity** ↔ bảng DB (Panache Active Record) | Không có tầng Repository |
| `src/main/java/com/ketoan/dto` | **DTO** cho payload vào/ra (`AuthRequest`, `AuthResponse`) | Danh mục/kho dùng thẳng Entity (xem §7) |
| `src/main/java/com/ketoan/config` | `RestApplication` (`@ApplicationPath("/api")`), `SecurityFilter` (JAX-RS filter) | |
| `src/main/java/com/ketoan/model` | POJO độc lập (`model/User`) — **code chết**, không dùng | Ứng viên xoá |
| `src/main/resources/db/migration` | **Flyway** — nguồn sự thật của schema | Sửa schema = thêm file `V0000X__*.sql` |
| `src/main/webui/src/core` | **Hạ tầng FE**: shell, auth, http, store, router, i18n, permission, UI kit | Không chứa nghiệp vụ |
| `src/main/webui/src/plugins` | **Nghiệp vụ FE**, mỗi plugin 1 thư mục có `index.jsx` export default | Tự đăng ký qua `import.meta.glob` |
| `src/main/webui/src/api` | Client REST theo nghiệp vụ (`inventoryApi.js`) | Tầng "Service" của FE |
| `src/main/webui-v1` | Bản thử nghiệm Fluent UI — **không được Quinoa tham chiếu** | Chỉ để tham khảo, xem §7 |
| `sql/` | Script SQL tham chiếu thủ công | Không chạy tự động |

### 1.6 Topology lúc chạy

```
                  ┌──────────────── Quarkus :8080 ────────────────┐
 Browser ────────▶│  Quinoa (serve SPA)  +  REST /api/**          │
                  │        │                      │               │
                  │        ▼                      ▼               │
                  │  webui/dist (prod)      Resource ──▶ Panache │
                  │  hoặc Vite :5173 (dev)   │        /EntityManager
                  └──────────────────────────┼────────────────────┘
                                             ▼
                                    PostgreSQL :5432  (Flyway)
```

* **Dev:** `:8080` phục vụ API, `:5173` phục vụ SPA, Quinoa proxy → **cùng origin logic**, cookie `SameSite=Lax` hoạt động.
* **Prod:** `./mvnw package` build luôn `webui` vào `dist/`, Quarkus phục vụ tại `/` cùng cổng 8080.
* Bí mật: `privateKey.pem` / `publicKey.pem` / `secretKey.jwk` nằm trong `resources`, đã bị `.gitignore` (chỉ commit file `*-sample`).

---

## 2. BACKEND ARCHITECTURE — KIẾN TRÚC BACKEND

### 2.1 Mô hình phân tầng thực tế

Prompt yêu cầu giải thích **Controller → Service → Repository → Database**. Trong repo này luồng đó được **rút gọn còn 3 tầng** (Repository bị loại bỏ, Service chỉ dùng cho Auth):

```
HTTP Request (JSON)
      │
      ▼
┌──────────────────────────────────────────────────────────────┐
│ TẦNG 1 — RESOURCE  ("Controller")  com.ketoan.resource       │
│  • @Path/@GET/@POST/@PUT/@DELETE — routing, HTTP status      │
│  • Đọc @QueryParam / @PathParam / @Context UriInfo           │
│  • Validate + ném BadRequestException / NotFoundException    │
│  • @Transactional cho thao tác ghi                          │
│  • Bọc lỗi thành JSON { "message": ... } (400/404/409/500)    │
└───────────────────────────┬──────────────────────────────────┘
                            │ (tuỳ chọn — chỉ Auth)
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ TẦNG 2 — SERVICE  com.ketoan.service   (@ApplicationScoped)   │
│  • Nghiệp vụ thuần Java, không biết HTTP (trừ khi throw)      │
│  • @Transactional: register / login / generateToken           │
│  • Băm mật khẩu (BCrypt), ký JWT, kiểm tra trùng username     │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ TẦNG 3 — PERSISTENCE  (KHÔNG có Repository)                  │
│  a) EntityManager + JPQL  → MasterResource (danh mục)        │
│  b) Panache Active Record → InvDoc/InvLine/User              │
│     InvDoc.listAll(Sort.desc("id")), InvDoc.count("type",…)  │
│     User.find("username", …).firstResult(), entity.persist() │
└───────────────────────────┬──────────────────────────────────┘
                            ▼
                PostgreSQL (schema do Flyway quản lý)
```

**Hệ quả cần nhớ:**
* Không viết `XxxRepository` mới — hoặc dùng JPQL qua `EntityManager`, hoặc dùng static API Panache của Entity.
* Không viết `XxxController` — tên lớp là `XxxResource`.
* Business logic lặp lại ở Resource được đẩy lên **lớp cha generic** (`MasterResource`) hoặc vào `service/` khi có transaction/nghiệp vụ thật.

### 2.2 Danh sách Resource hiện có

| Class | `@Path` (đầy đủ `/api/...`) | Entity | Kế thừa `MasterResource` | Đặc thù |
| :--- | :--- | :--- | :---: | :--- |
| `MasterResource<T>` | — | `MasterEntity` | *(abstract)* | CRUD + `q` + sort + phân trang + `nextCode()` + 409 |
| `SupplierResource` | `/suppliers` | `Supplier` | ✅ | `codePrefix="NCC"`, lọc `phone` = `has` hoặc `none`, sort `code/name/phone/address` |
| `CustomerResource` | `/customers` | `Customer` | ✅ | `codePrefix="KH"`, tái dùng `SupplierResource.phoneFilter` |
| `MaterialResource` | `/materials` | `Material` | ✅ | `codePrefix="VT"`, `left join MaterialType` để sort `typeName`, lọc `typeId/priceMin/priceMax` |
| `MaterialTypeResource` | `/material-types` | `MaterialType` | ✅ | Chỉ search `name` (không có `code` thực dùng) |
| `BankResource` | `/banks` | `Bank` | ✅ | `codeRequired=true`, lọc `branch` (like) |
| `AccountResource` | `/accounts` | `Account` | ✅ | `codeRequired=true`, lọc `group` = chữ số đầu của số hiệu (1xx…9xx) |
| `AuthResource` | `/auth` | `User` | ❌ | `register`, `login`, `loginv1` (cookie), `me`, `logout` |
| `InvDocResource` | `/inventory/docs` | `InvDoc`+`InvLine` | ❌ | REST phiếu kho (hiện chưa search/filter/phân trang — xem §7) |
| `HelloResource` | `/public/hello` | — | ❌ | Smoke test, trả text thuần |

> `@Authenticated` được khai báo trên `MasterResource` nên **mọi endpoint danh mục đều cần cookie JWT hợp lệ**. `InvDocResource` hiện **chưa** có annotation này (xem §7 — lỗ hổng bảo mật).

### 2.3 `MasterResource<T>` — mẫu Template Method (trái tim của backend danh mục)

Đây là **pattern quan trọng nhất cần tuân theo** khi thêm danh mục mới. Lớp cha giữ toàn bộ CRUD; lớp con chỉ "khai báo" metadata:

| Hook (override được) | Kiểu | Mặc định | Ý nghĩa |
| :--- | :--- | :--- | :--- |
| `type()` | `Class<T>` | **bắt buộc** | Entity class cho `em.find/createQuery` |
| `searchFields()` | `List<String>` | **bắt buộc** | Các cột mà `q` sẽ `lower(...) like %q%` (join bằng `or`) |
| `codePrefix()` | `String` | `null` | Có tiền tố → `POST` với `code` trống sẽ tự sinh `NCC0001`, `VT0001`… |
| `codeRequired()` | `boolean` | `false` | `true` → `code` bắt buộc (banks, accounts) |
| `from()` | `String` | `from <Type> e` | Có thể thay bằng JPQL join, ví dụ Material join `MaterialType` |
| `sortable()` | `Map<String,String>` | `code`, `name` | **Whitelist** field sort → tránh JPQL injection |
| `applyFilters(MultivaluedMap, Where)` | `void` | rỗng | Thêm điều kiện lọc động bằng helper `first(f,"key")` + `w.and(...)` |
| `normalize(T)` | `void` | rỗng | Chuẩn hoá trước khi lưu (ví dụ `""` → `null` cho `<select>`) |
| `validate(T)` | `void` | name bắt buộc | Ném 400 kèm `{"message": ...}` |

**Cơ chế đáng lưu ý:**
* `Where` (inner class) là builder nối chuỗi `" where 1=1 and ..."` + `Map<String,Object> params` (named parameter, **không nối giá trị** → an toàn injection).
* `nextCode(prefix)` đọc mã lớn nhất đang có (`order by e.code desc`) rồi `+1`, định dạng `%04d`. **Không an toàn khi ghi đồng thời** (đã ghi chú trong code: chuyển sang sequence/counter nếu scale).
* `flushOrConflict(msg)` chủ động `em.flush()` để bắt vi phạm unique/FK **ngay trong transaction** và trả **409 Conflict** thay vì 500 — chốt chặn cuối là `UNIQUE INDEX ... LOWER(code)` trong DB.
* `GET /…` không có `page`/`pageSize` → trả **tối đa 10 000 dòng** (phục vụ dropdown); có tham số → phân trang (`pageSize` bị chặn trong `[1,100]`).

### 2.4 Hợp đồng REST chuẩn của danh mục (dùng chung cho 6 danh mục)

```http
# LIST — có phân trang/lọc/sắp xếp (đúng những gì createstore.js gửi lên)
GET /api/suppliers?q=phong&page=1&pageSize=20&sort=name&dir=asc&phone=has
  200 → { "items": [ {...} ], "total": 135 }

GET /api/suppliers                     # không tham số → phục vụ dropdown, tối đa 10.000 dòng
GET /api/suppliers/{id}                200 | 404
POST /api/suppliers                    body JSON (không cần id/code) → 201 + bản ghi (id & code do server cấp)
PUT  /api/suppliers/{id}               partial update (Jackson updateValue) → 200 + bản ghi
DELETE /api/suppliers/{id}             204 | 404
```

**Quy ước lỗi (mọi Resource dùng chung 1 định dạng):**

| HTTP | Khi nào | Body |
| :--- | :--- | :--- |
| `400` | Validate thất bại (`validate`/`bad(msg)`) | `{"message":"Tên không được để trống"}` |
| `401` | Thiếu/hết hạn cookie JWT (do `@Authenticated`) | *(do Quarkus sinh)* |
| `404` | `em.find` không thấy | *(rỗng)* |
| `409` | Trùng `code` (unique index) hoặc vướng khóa ngoại khi xoá | `{"message":"Mã đã tồn tại hoặc dữ liệu không hợp lệ"}` |
| `500` | Lỗi ngoài dự kiến | *(mặc định của Quarkus)* |

> FE đọc lỗi theo thứ tự `data?.message ?? data?.error ?? statusText` (`core/http.js`, `core/api.js`) ⇒ **luôn trả `{"message": ...}`** cho lỗi nghiệp vụ mới.

### 2.5 Xác thực & Bảo mật — luồng thực tế

```
POST /api/auth/loginv1  {username, password}
        │
        ▼ AuthResource.loginv1
   AuthService.generateToken(req)
        │  1. User.findByUsername(username)
        │  2. BcryptUtil.matches(raw, user.password)   ── sai ⇒ 401 {"error":"Tên đăng nhập hoặc mật khẩu không đúng!"}
        │  3. Jwt.issuer("https://vinhcancode.local")
        │       .subject(upn=username).groups({admin|user})
        │       .claim("name", …).expiresIn(86400).sign()     ← ký RSA bằng privateKey.pem
        ▼
   NewCookie("token")  httpOnly=true · path=/ · SameSite=Lax · maxAge=86400 · secure=false
        │  (body chỉ trả {"message":"Đăng nhập thành công"} — token KHÔNG lộ ra JS)
        ▼
GET /api/auth/me   (@RolesAllowed({"admin","user"}))
        │  JsonWebToken jwt đọc từ cookie → trả { username, name, role }
        ▼
POST /api/auth/logout → set cookie token maxAge=0
```

**Các điểm bảo mật đang có:**
* JWT **stateless**, không lưu token trong DB; cột `users.token` đã bị comment bỏ.
* `mp.jwt.token.header=Cookie` + `mp.jwt.token.cookie=token` ⇒ Quarkus tự đọc JWT từ cookie HttpOnly (chống XSS đọc token).
* `sameSite=LAX` (giảm CSRF), `httpOnly=true`; **`secure=false` ⇒ khi lên HTTPS phải đổi thành `true`**.
* BCrypt qua `BcryptUtil` (`quarkus-security-jpa` + elytron security common); seed user `admin`/`user1`/`vinhtran` mật khẩu `123` (`V00002`).
* `AuthService.normalizeRole()` hạ mọi role lạ về `user` (`ROLE_ADMIN`/`ADMIN` → `admin`).
* Quyền ghi danh mục: gợi ý sẵn trong code — thêm `@RolesAllowed("admin")` lên `POST/PUT/DELETE` (hiện **chưa** làm).

**Điểm rủi ro cần biết** (chi tiết §7): `SecurityFilter` chỉ kiểm tra **cookie có tồn tại** (và `System.out.println` mỗi request), phần xác minh chữ ký do `@Authenticated` của Quarkus lo; `AuthResource.login()` (khác `loginv1`) vẫn trả `UUID.randomUUID()` **không phải JWT** ⇒ endpoint này coi như code chết, không dùng.

### 2.6 Luồng nghiệp vụ Kho (InvDoc)

```
FE inventoryApi.create(payload)
        ▼  POST /api/inventory/docs   (body = InvDoc JSON, gồm mảng lines)
InvDocResource.create(InvDoc d)  @Transactional
    1. d.id = null; mọi d.lines[].id = null          ← server cấp khoá
    2. n = InvDoc.count("type", d.type) + 1
       d.no = PREFIX[type] + %04d                    ← PN/PX/PT
    3. d.persist()  → cascade ALL + orphanRemoval + @OrderColumn("pos") lưu cả lines
    4. 201 + entity (có id, no, lines)
```

* `Ref` là `@Embeddable {id, name}` → **snapshot tên đối tác/sản phẩm tại thời điểm lập phiếu** (đổi tên danh mục không làm sai phiếu cũ). `partner` trỏ tới 2 bảng khác nhau nên **cố ý không đặt FK**; `bank`/`product` có FK trong DB.
* `PUT` ghi đè master (`partner/bank/date/note`) và **dựng lại toàn bộ `lines`** (`clear()` + add lại, id mới) → đơn giản nhưng tăng id, xem §7.
* `line_total` là **generated column** trong Postgres (`qty*price`) → map `insertable=false, updatable=false`.

### 2.7 Entity & DTO

| Nhóm | Entity | Bảng | Khoá | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Danh mục | `MasterEntity` (`@MappedSuperclass`) | — | `String id` | `id` **UUID sinh trong `@PrePersist`** (không dùng `@GeneratedValue`) |
| | `Supplier`, `Customer`, `Bank`, `Account`, `Material`, `MaterialType` | `suppliers`, `customers`, `banks`, `accounts`, `materials`, `material_types` | `varchar(36)` | `Material.typeId` map tường minh `@Column(name="type_id")` |
| Auth | `User` | `users` | `Long id` `IDENTITY` | `username`, `password`(BCrypt), `role`; static `findByUsername` |
| Kho | `InvDoc` | `inv_doc` | `Long id` `IDENTITY` | `no`, `type ∈ {import,export,return}`, `doc_date`, `partner`/`bank` (`@Embedded Ref`), `lines` (`@OneToMany`, `@JoinColumn(doc_id)`, `@OrderColumn(pos)`) |
| | `InvLine` | `inv_doc_line` | `Long id` `IDENTITY` | `product` (`@Embedded Ref`), `qty`, `price`, `lineTotal` (read-only) |
| | `Ref` (`@Embeddable`, package-private) | — | — | `{id, name}` — dùng cho `partner`/`bank`/`product` |
| DTO | `AuthRequest` / `AuthResponse` | — | — | `{username,password}` / `{token}`; field `public` (Jackson tự map) |
| Chết | `model.User` | — | — | POJO thừa, trùng tên `entity.User` ⇒ **nên xoá** |

> **Quy ước:** entity danh mục dùng field `public` (Active Record style của Panache, không có getter/setter) — giữ nguyên khi thêm field mới.

### 2.8 Database & Flyway

| File | Nội dung |
| :--- | :--- |
| `V00001__init.sql` | `users(id bigserial, username)` |
| `V00002__add_password_and_role_to_users.sql` | `+ password, role`; seed `admin`,`user1`,`vinhtran` (BCrypt của `123`) |
| `V00003__add_master_data.sql` | Bật `pg_trgm`; tạo 6 bảng danh mục; mỗi bảng: `PK varchar(36)`, `UNIQUE INDEX LOWER(code)`, index `LOWER(name)`, **GIN trgm** cho `code/name/phone/address/branch`; `materials.type_id FK → material_types ON DELETE RESTRICT` |
| `V00004__master_date_dummy.sql` | Dữ liệu mẫu tiếng Việt cho 6 danh mục |
| `V00005__document.sql` | `inv_doc_counter` (bộ đếm PN/PX/PT), `inv_doc`, `inv_doc_line` (generated `line_total`) |

**Quy tắc vàng khi sửa schema:** KHÔNG sửa file migration cũ đã chạy — **luôn thêm `V0000X__mo_ta.sql`**. Ứng dụng đặt `quarkus.hibernate-orm.database.generation=none` nên **DB chỉ đổi qua Flyway**; entity lệch migration sẽ nổ lúc runtime (`column does not exist`).

---

## 3. FRONTEND ARCHITECTURE — KIẾN TRÚC FRONTEND

### 3.1 Hai frontend, chỉ một đang chạy

| | `src/main/webui` ✅ **ĐANG DÙNG** | `src/main/webui-v1` ⚠️ **THỬ NGHIỆM** |
| :--- | :--- | :--- |
| Quinoa tham chiếu | ✅ (mặc định `ui-dir=webui`) | ❌ (không có cấu hình nào trỏ tới) |
| React | 18.3.1 + Vite 5.4 + `@vitejs/plugin-react` 4 | React 19 + Vite 8 + **@fluentui/react 8** |
| Kiến trúc | **Plugin registry** + store layer + i18n + permission | 1 `App.jsx` + 9 component rời, hash `/mod/folder/id` |
| Dữ liệu | REST thật (danh mục + kho) hoặc mock store | `services/api.js` **100% dummy data** |
| Auth | Cookie HttpOnly + `/api/auth/*` | `localStorage.auth_token` + user giả trong `services/api.js` |
| Trạng thái | Đang bảo trì chính | Chỉ để tham khảo layout Fluent UI |

> Mọi thay đổi tính năng **phải làm trong `webui`**. Chỉ sửa `webui-v1` nếu yêu cầu nói rõ.

### 3.2 Luồng khởi động (boot flow)

```
index.html
  └─ src/main.jsx
       ├─ import './plugins'      ← side-effect: đăng ký TẤT CẢ plugin TRƯỚC khi render
       │     └─ plugins/index.js: import.meta.glob('./*/index.jsx', {eager:true})
       │           └─ registerPlugin(module.default)   (bỏ qua SKIPPED_PLUGINS: calendar, mail, tasks, people)
       │                 └─ addMessages(p.messages)  +  p.setup?.({bus})
       └─ createRoot(...).render(
             <I18nProvider> <ConfirmProvider> <AuthProvider> <Gate/> …
                 Gate = useAuth().user ? <Shell/> : <Login/>
```

`registerPlugin` là **điểm mở rộng duy nhất**: thêm thư mục `src/plugins/<id>/index.jsx` export default object hợp lệ ⇒ tự xuất hiện trong Rail, Global Search, Ribbon.

### 3.3 Luồng dữ liệu FE mà prompt hỏi: "Page → Component → Service → API"

Ánh xạ sang kiến trúc thật của repo:

| Khái niệm prompt | Tương ứng trong repo | Ví dụ |
| :--- | :--- | :--- |
| **Page** | **Plugin** = `plugins/<id>/index.jsx` (object `{id,title,icon,View,…}`) | `plugins/inventory/index.jsx` |
| **Component** | Component con khai báo trong cùng file hoặc `core/*.jsx`/`Autocomplete.jsx` | `ListView`, `FormView`, `Autocomplete`, `Loading` |
| **Service** | `src/api/<domain>Api.js` và/hoặc store facade trong `core/masterdata.js` | `inventoryApi.js`, `suppliersStore` |
| **API** | `core/http.js` (`http.get/post/…`) & `core/api.js` (`apiFetch`) → REST `/api/**` | `http.get('/inventory/docs')` |

**Ví dụ trọn vòng cho Kho:**

```
shell.render(<active.View {...props} />)          ← Page (plugin View)
   └─ FormView.doSave()
        └─ saveDoc(doc)  (service nội bộ plugin: chuẩn hoá payload)
             └─ inventoryApi.update(id, payload)   ← Service
                  └─ http.put('/inventory/docs/'+id, payload)   ← API wrapper
                       └─ fetch('/api/inventory/docs/'+id, credentials:'include')  ← HTTP
                            └─ InvDocResource.update()  → Panache → PostgreSQL
```

**Ví dụ trọn vòng cho Danh mục (đi qua store):**

```
Body() → suppliersStore.useQuery({q,page,pageSize,sort,filters})
   └─ createStore('/suppliers').useQuery  → useAsyncQuery → http.get('/suppliers?...')
        └─ SupplierResource.list() → EntityManager JPQL → {items,total}
```

### 3.4 Store layer — trái tim của tầng dữ liệu FE

`core/masterdata.js` tạo 6 store bằng **một cờ duy nhất** `VITE_USE_REAL_API`:

```js
const makeStore = (prefix, resource, seed) =>
  USE_REAL_API ? createRealStore(resource) : createMockStore(prefix, seed);

export const suppliersStore = makeStore('NCC', '/suppliers', [seed…]);
```

Bộ store (`suppliersStore`, `customersStore`, `banksStore`, `materialTypesStore`, `materialsStore`, `accountsStore`) **cùng một interface**, nên UI không cần biết nguồn dữ liệu:

| API store | Trả về | Dùng ở đâu |
| :--- | :--- | :--- |
| `use()` | `{items, loading, error, reload}` — tải **toàn bộ** (tối đa 10.000) | dropdown loại vật tư, tiện ích |
| `useQuery(query,{enabled})` | `{items, total, loading, fetching, error, reload}` — theo trang | bảng Catalog: `query = {q,page,pageSize,sort:{key,dir},filters:{}}` |
| `search(q,{limit=20})` | `Promise<row[]>` | ô `Autocomplete` |
| `add / update / remove` | `Promise<row>` — **không lạc quan**, chờ server xác nhận rồi mới sửa cache | form Thêm/Sửa/Xoá |
| `load / reset` | `reset()` gọi khi logout để không lộ dữ liệu người trước | `resetAllStores()` |
| `list` (getter) | mảng hiện tại (không reactive) | `resolve.typeName` mock |

**Chi tiết cơ chế:**
* `createstore.js` = gọi REST thật; `mockstore.js` = `queryLocal()` mô phỏng **đúng hợp đồng server** (q bỏ dấu tiếng Việt, filters, sort, phân trang) + `mockConfig.failRate` để thử nhánh lỗi.
* `useasyncquery.js` = hook chung: `AbortController` huỷ request cũ, `enabled` để hoãn khi debounce, `refresh` (version) để reload sau add/update/remove, phân biệt `loading` (lần đầu) vs `fetching` (đang tải lại).
* Mọi store reactive bằng `useSyncExternalStore` (không Redux/Zustand/Context cho data).
* `inventoryApi.js` (kho) **không** dùng store factory vì phiếu kho là master-detail → dùng state module + cùng pattern `useSyncExternalStore` trong plugin (`useDocs`).

### 3.5 Hợp đồng Plugin (bắt buộc tuân theo)

```js
export default {
  id: 'inventory',                 // bắt buộc, duy nhất — cũng là "module key" cho phân quyền
  title: 'inv.title',              // bắt buộc — KEY i18n, không phải chuỗi hiển thị
  icon: '📦',                      // emoji hiện trên Rail
  order: 5,                        // thứ tự trên Rail (mặc định 100)
  adminOnly: false,                // true ⇒ chỉ role admin thấy (ví dụ: admin)
  initialState: { mode: 'list', … },   // state mặc định, được lưu vào location.hash
  messages: { vi: {...}, en: {...} },  // tự đăng ký từ điển i18n
  search: async (q) => [{ id, title, subtitle, state }],  // cho Global Search
  refresh: () => load(),           // nút ⟳ trên Ribbon (mặc định tăng state.reload)
  setup: ({ bus }) => { … },       // đăng ký listener event bus (1 lần)
  Menu: ({state,setState}) => <>…</>,       // sidebar (tuỳ chọn)
  Badge: () => <span className="badge">3</span>,  // số đỏ trên icon (tuỳ chọn)
  ribbon: ({state,setState,can,t,bus,role}) => ({ tabs:[…], groups:{ home:[…] } }),
  View: ({state,setState,can,role,bus}) => <>…</>,  // bắt buộc — vùng nội dung chính
};
```

**Props mà Shell truyền cho `Menu` / `View` / `ribbon`** (`Shell.jsx`):

| Prop | Ý nghĩa |
| :--- | :--- |
| `state` | state riêng của plugin (đọc từ `location.hash.store[pluginId]`, fallback `initialState`) |
| `setState(patch, {replace})` | merge shallow vào state plugin; `replace:true` = cập nhật trang hiện tại (gõ chữ, tick), mặc định = tạo entry mới cho Back/Forward |
| `can(pluginId, action)` | `role === 'admin'` **hoặc** `perms[pluginId][action]` — **mọi nút ghi/sửa/xoá phải set `disabled: !can(...)`** |
| `role` | `'admin'` \| `'user'` — **chỉ dùng để ẩn/hiện UI; quyền thật phải do server kiểm tra** |
| `bus` | event bus (`bus.on/emit`) để plugin nói chuyện mà không import nhau (ví dụ `task:create`) |
| `t` | hàm dịch i18n |

**Quy ước kiểm tra quyền trong View:** `if (!props.can('<id>', 'read')) return <Denied />;` và **toàn bộ hook nằm ở component con** (Catalog dùng `Body` với `key={state.category}`) để không vi phạm Rules of Hooks.

### 3.6 Điều hướng & state (`core/router.js`)

* Không dùng react-router. Toàn bộ `{pluginId, found, store}` được **JSON + encodeURIComponent** vào `location.hash` (`#...`).
* `useHistoryState(initial)` → `[state, nav(next, {replace})]`; lắng nghe `popstate` ⇒ nút **◀ ▶ Back/Forward của trình duyệt hoạt động**.
* Ghi nhớ quy tắc `replace`:
  * `{replace: true}` — thay đổi tạm (gõ từ khoá, tick chọn, đổi filter, đổi danh mục trong bảng).
  * Không truyền — điều hướng thật (đổi plugin, mở phiếu, mở kết quả search, chuyển `mode: 'form'`) ⇒ tạo entry mới để Back quay lại.
* `state` **không dùng để lưu dữ liệu lớn** (nằm trong URL): chỉ lưu filter/page/mode/id/editing của phiếu.

### 3.7 i18n, Permissions, UI kit

| Vấn đề | Cách làm chuẩn |
| :--- | :--- |
| Thêm chuỗi mới | Khai báo trong `messages: {vi:{'inv.xxx':…}, en:{…}}` của plugin rồi gọi `t('inv.xxx')`. `addMessages` merge lúc `registerPlugin`. |
| Fallback | `dict[lang][k] ?? dict.vi[k] ?? k` ⇒ **luôn khai báo cả `vi` và `en`** |
| Phân quyền | Ma trận `read/create/update/delete` cho role `user`, lưu `localStorage.perms_user` (`core/permissions.js`); admin luôn full; thêm plugin mới ⇒ bổ sung `PLUGIN_IDS` + `DEFAULT` |
| Xác nhận nguy hiểm | `const confirm = useConfirm(); if (!(await confirm(t('cat.confirmDelete')…))) return;` — **không dùng `window.confirm`** (trừ code cũ trong plugin legacy) |
| Loading | `<Loading/>` / `<Spinner/>` từ `core/ui.jsx`; bảng dùng `aria-busy` + class `fetching` |
| Lỗi | Banner `role="alert"` + nút *Thử lại*; lỗi validate form dùng class `formError` |
| CSS | `styles.css` dùng biến `--brand/--panel/--line/--muted`, class chung: `.pad .tb .btn .item .row .empty .tb .xbtn .invtable .cattools .filter .searchbox .pager .ghead .masterhead`; plugin có thể chèn `<style>{CSS}</style>` cục bộ (Catalog/Inventory đang làm) |
| Accessibility | Mọi nút icon-only phải có `title` + `aria-label`; sort dùng `aria-sort`; checkbox dùng `aria-label` |
| Ngôn ngữ UI | Chữ trên UI **bắt buộc qua `t()`**; comment trong code viết tiếng Việt |

### 3.8 Biến môi trường FE & tích hợp Quinoa

```
webui/.env.local-sample  →  .env.local      VITE_USE_REAL_API=true
```
* `VITE_USE_REAL_API` — quyết định store mock/real (§3.4, `core/config.js`). **Vite chỉ đọc env lúc khởi động ⇒ phải restart dev server.**
* `VITE_API_BASE` (mặc định `''` = same-origin) cho `core/api.js` — chỉ cần khi BE khác origin.
* `VITE_API_URL` (mặc định `/api`) cho `core/http.js`.
* Hai client fetch song song: **`apiFetch` (`core/api.js`)** dùng cho Auth + GlobalSearch (có `silent401`, phát hiện server trả HTML), **`http` (`core/http.js`)** dùng cho store/API nghiệp vụ. Cả hai đều `credentials: 'include'` để gửi cookie HttpOnly. **Khi viết API mới, chọn client theo mẫu đã dùng ở khu vực đó** (`inventoryApi` → `http`), không tạo client thứ ba.
* `core/api.js` còn có `useApi(fetcher, deps)` (hook tải một lần) và `setUnauthorizedHandler` để tự đăng xuất khi 401.

---

## 4. MODULE MAP — BẢN ĐỒ PHÂN HỆ

### 4.1 Nghiệp vụ (end-to-end)

| # | Module | FE Plugin | FE Service / Store | BE Resource | BE Entity | Bảng DB | Trạng thái |
| :- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Xác thực** | `core/Login.jsx` + `core/auth.jsx` (không phải plugin) | `core/api.js` (`apiFetch`) | `AuthResource` + `AuthService` | `entity.User` | `users` | ✅ 90% |
| 2 | **Danh mục – NCC** | `plugins/catalog/index.jsx` (`category:'suppliers'`) | `suppliersStore` | `SupplierResource` | `Supplier` | `suppliers` | ✅ |
| 3 | **Danh mục – Khách hàng** | idem (`customers`) | `customersStore` | `CustomerResource` | `Customer` | `customers` | ✅ |
| 4 | **Danh mục – Vật tư** | idem (`materials`) | `materialsStore` (+`typeName`) | `MaterialResource` | `Material` | `materials` | ✅ |
| 5 | **Danh mục – Loại vật tư** | idem (`materialTypes`) | `materialTypesStore` | `MaterialTypeResource` | `MaterialType` | `material_types` | ✅ |
| 6 | **Danh mục – Ngân hàng** | idem (`banks`) | `banksStore` | `BankResource` | `Bank` | `banks` | ✅ |
| 7 | **Danh mục – TK kế toán** | idem (`accounts`) | `accountsStore` | `AccountResource` | `Account` | `accounts` | ✅ |
| 8 | **Kho (phiếu NK/XK/PT)** | `plugins/inventory/index.jsx` | `src/api/inventoryApi.js` | `InvDocResource` | `InvDoc`+`InvLine` | `inv_doc`, `inv_doc_line`, `inv_doc_counter` | 🟢 80% |
| 9 | **Phân quyền** | `plugins/admin/index.jsx` (`adminOnly`) | `core/permissions.js` | — | — | — | 🟡 60% (chỉ localStorage) |
| 10 | **Global Search** | `core/GlobalSearch.jsx` (khung trong Shell) | `plugin.search()` từng plugin | — | — | — | ✅ |
| 11 | **i18n / Ribbon / Shell** | `core/i18n.jsx`, `core/ribbon.jsx`, `core/Shell.jsx` | — | — | — | — | ✅ |

### 4.2 Plugin đã viết nhưng **đang bị tắt**

`plugins/index.js` loại 4 plugin legacy qua `SKIPPED_PLUGINS`; chúng vẫn nằm trong repo và **còn tham chiếu trong `admin` (`NAMES`) + `permissions.js` (comment)**:

| Plugin | File | Dữ liệu | Trạng thái |
| :--- | :--- | :--- | :--- |
| `mail` | `plugins/mail/index.jsx` | `fakeApi` + `SEED` in-memory | ⏸ Bị skip |
| `calendar` | `plugins/calendar/index.jsx` | idem | ⏸ Bị skip |
| `people` | `plugins/people/index.jsx` | idem | ⏸ Bị skip |
| `tasks` | `plugins/tasks/index.jsx` | idem (nhận `bus.emit('task:create')`) | ⏸ Bị skip |

⇒ Muốn bật lại: xoá tên khỏi `SKIPPED_PLUGINS` **và** thêm id vào `PLUGIN_IDS`/`DEFAULT` của `permissions.js`.

### 4.3 Shared components & utilities (task 7 — tái sử dụng, KHÔNG viết lại)

**Frontend — UI component dùng chung (`src/main/webui/src/core/`)**

| Xuất | File | Công dụng |
| :--- | :--- | :--- |
| `Spinner`, `Loading`, `RefreshBtn` | `ui.jsx` | Trạng thái chờ thống nhất |
| `Denied` | `Denied.jsx` | Chặn khi thiếu quyền `read` |
| `Autocomplete` | `Autocomplete.jsx` | Ô chọn có gợi ý + debounce 250ms + tạo mới (`onCreate`); chuẩn hoá bỏ dấu tiếng Việt |
| `useConfirm`, `ConfirmProvider` | `confirm.jsx` | Hộp thoại xác nhận `Promise<boolean>` |
| `GlobalSearch` | `GlobalSearch.jsx` | Tìm xuyên plugin |
| `Ribbon`, `commonTabs`, `buildTabs` | `ribbon.jsx` | Ribbon Office style; plugin bơm `tabs`/`groups` |
| `Shell` | `Shell.jsx` | Khung: Topbar + Ribbon + Rail + Sidebar + main |
| `LangSwitch` | `i18n.jsx` | Select đổi VI/EN |

**Frontend — tiện ích/hạ tầng dùng chung**

| Xuất | File | Công dụng |
| :--- | :--- | :--- |
| `vnd(n)`, `matchName()` | `masterdata.js` | Format tiền `1.234.567 đ`; lọc theo tên |
| `useDebounced(value, ms)` | `catalog/index.jsx` ⚠️ cục bộ | Trì hoãn 300ms — **nên nâng lên `core/`** nếu dùng lại |
| `norm(s)` (bỏ dấu) | `Autocomplete.jsx`, `catalog`, `mockstore` ⚠️ lặp 3 nơi | Chuẩn hoá so khớp tiếng Việt — **nên gom về 1 chỗ** |
| `csvEsc`, `downloadTemplate` | `catalog/index.jsx` | Sinh CSV mẫu UTF-8 BOM — Inventory có bản tương tự |
| `HeaderCheck` | `catalog` & `inventory` ⚠️ trùng code | Checkbox indeterminate "chọn tất cả" |
| `Pager`, `Toolbar`, `filtersFor/schemaFor` | `catalog/index.jsx` | Bộ khung bảng danh mục (Inventory có biến thể riêng) |
| `useAsyncQuery`, `useApi` | `useasyncquery.js`, `api.js` | Hook tải dữ liệu + huỷ request |
| `createStore` | `createstore.js` | Store CRUD REST tổng quát |
| `mockConfig.failRate` | `mockstore.js` | Giả lập lỗi khi dev |

**Backend — dùng chung**

| Xuất | File | Công dụng |
| :--- | :--- | :--- |
| `MasterResource<T>` + `Where` + `first()` + `nextCode()` + `flushOrConflict()` + `bad()` | `MasterResource.java` | Toàn bộ CRUD/lọc/sort/phân trang dùng chung |
| `SupplierResource.phoneFilter(f,w)` | `SupplierResource.java` | Tái dùng bởi `CustomerResource` |
| `AuthService.ISSUER`, `TOKEN_TTL_SECONDS`, `normalizeRole()` | `AuthService.java` | Hằng số/tiện ích xác thực |
| `@ApplicationPath("/api")` | `RestApplication.java` | Tiền tố REST chung |

---

## 5. NAMING CONVENTIONS — QUY ƯỚC ĐẶT TÊN

### 5.1 Backend (Java)

| Đối tượng | Quy ước | Ví dụ thật trong repo |
| :--- | :--- | :--- |
| Package | `com.ketoan.<layer>` — chỉ 1 cấp, không chia theo feature | `com.ketoan.resource`, `com.ketoan.entity` |
| REST class | `<NghiệpVụ>Resource` (**không** phải `Controller`/`Servlet`) | `SupplierResource`, `InvDocResource`, `AuthResource` |
| Lớp cha generic | `<KháiNiệm>Resource<T extends …>` | `MasterResource<T extends MasterEntity>` |
| Service | `<NghiệpVụ>Service` + `@ApplicationScoped` | `AuthService` |
| Entity | Danh từ số ít, PascalCase, khớp bảng ở `@Table(name=…)` | `Supplier` → `suppliers`, `InvDoc` → `inv_doc` |
| Entity danh mục | `extends MasterEntity` (id/code/name có sẵn) | `Bank extends MasterEntity` |
| Entity có khoá số | `extends PanacheEntityBase` + `@Id @GeneratedValue(IDENTITY)` | `InvDoc`, `InvLine`, `User` |
| Trường entity | `camelCase`, **`public`** (không getter/setter) | `public String phone;` |
| Cột khác quy ước | `@Column(name="snake_case")` tường minh | `@Column(name="type_id")`, `@Column(name="doc_date")` |
| DTO | `<NghiệpVụ>Request` / `<NghiệpVụ>Response` trong `com.ketoan.dto` | `AuthRequest`, `AuthResponse` |
| Method resource | Động từ ngắn: `list`, `get`, `create`, `update`, `delete` | `MasterResource.list/get/create/update/delete` |
| Hook override | `type()`, `searchFields()`, `applyFilters()`, `sortable()`, `normalize()`, `validate()` | xem §2.3 |
| Hằng số | `static final` + `UPPER_SNAKE` | `AuthService.ISSUER`, `TOKEN_TTL_SECONDS` |
| Biến/hàm | `camelCase`, tên viết tắt **có nghĩa** | `w` (Where), `e` (entity), `em` (EntityManager), `pg/size`, `q` |
| Helper private | `private static` + tên mô tả cách làm | `normalizeRole`, `flushOrConflict`, `nextCode`, `phoneFilter`, `bad` |
| Comment | **Tiếng Việt**, giải thích *vì sao* (đặc biệt chỗ đánh đổi) | `// Vi phạm unique / khóa ngoại chỉ nổ khi flush => …` |
| Javadoc | Chỉ template mặc định `@author tbvinh`, không bắt buộc nội dung | `MasterResource.java` |

### 5.2 REST API

| Quy ước | Giá trị |
| :--- | :--- |
| Tiền tố | `/api` (từ `@ApplicationPath`), khai báo trong Resource bằng đường dẫn **không** có `/api` |
| Đường dẫn | **danh từ số nhiều, kebab-case** | `/suppliers`, `/customers`, `/material-types`, `/accounts`, `/banks`, `/materials`, `/inventory/docs` |
| Hành động phụ | `POST /<resource>/bulk-delete` (động từ ở cuối, chỉ khi không thể biểu diễn bằng HTTP method) |
| Tham số list | `q`, `page`, `pageSize`, `sort`, `dir` + tên bộ lọc trùng key FE (`typeId`, `priceMin`, `priceMax`, `phone`, `branch`, `group`) |
| Auth | `POST /auth/loginv1` (cookie), `/auth/me`, `/auth/logout`; `/auth/register`, `/auth/login` (legacy) |
| Lỗi | `{"message": "..."}` (danh mục/kho) hoặc `{"error": "..."}` (Auth — chọn `message` cho code mới) |

### 5.3 Frontend (React/JS)

| Đối tượng | Quy ước | Ví dụ |
| :--- | :--- | :--- |
| Thư mục plugin | `kebab/lowercase` = `plugin.id` | `catalog`, `inventory`, `admin` |
| File plugin | **luôn** `index.jsx` export default object | `plugins/inventory/index.jsx` |
| Component React | `PascalCase`; file `.jsx` | `Autocomplete.jsx`, `GlobalSearch.jsx`, `FormView` |
| Component con | Khai báo **trong cùng file plugin**, `PascalCase` (`ListView`, `FormView`, `Toolbar`, `Pager`, `Menu`, `Body`) |
| Hook | `useXxx` camelCase; file `.js` nếu không chứa JSX | `useAsyncQuery`, `useHistoryState`, `useDebounced`, `useDocs` |
| Mutation/method | camelCase động từ | `setState`, `toggleSort`, `toggleOne`, `setFilter`, `onBulkDelete` |
| Store | `<danh từ số nhiều>Store` | `suppliersStore`, `accountsStore` |
| API client | object `<nghiệpVụ>Api` trong `src/api/<nghiệpVụ>Api.js` | `inventoryApi` (`list/get/create/update/delete/bulkDelete`) |
| Hằng số module | `UPPER_SNAKE` | `SKIPPED_PLUGINS`, `PAGE_SIZES`, `EMPTY_VIEW`, `NO_FILTERS`, `IMPORT_SPEC`, `CATS`, `PREFIX` |
| Sự kiện handler | `onXxx` (prop), `xxx`/`doXxx` (nội bộ) | `onChange`, `doSave`, `doDelete` |
| Import | Dùng **đuôi file tường minh** cho module nội bộ: `.js`/`.jsx` | `import { http } from './http.js'` |
| CSS class | `kebab-case` ngắn; biến CSS `--brand/--panel/--line/--muted` | `invtable`, `cattools`, `formError`, `masterhead` |

### 5.4 i18n key

| Quy ước | Ví dụ |
| :--- | :--- |
| `<prefix>.<ý>` — prefix = tên plugin (as-is, không viết lại) | `inv.title`, `cat.suppliers`, `admin.perm` |
| Prefix legacy không khớp tên plugin (giữ nguyên vì đã phổ biến) | `cal.*` (calendar), `mail.*`, `people.*`, `tasks.*` |
| Key dùng chung | `app.name`, `logout`, `common.refresh`, `nav.back`, `search.*`, `perm.denied`, `role.admin`, `ac.*` |
| Placeholder thay bằng `.replace()` | `'cat.range': 'Hiển thị {from}–{to} / {total}'` → `.replace('{from}', …)` |
| Luôn có **cả `vi` và `en`** | (bắt buộc — xem §3.7) |

### 5.5 Database & mã nghiệp vụ

| Quy ước | Giá trị |
| :--- | :--- |
| Tên bảng | `snake_case` số nhiều (`suppliers`, `material_types`) hoặc có tiền tố miền (`inv_doc`, `inv_doc_line`) |
| Tên cột | `snake_case` (`type_id`, `doc_date`, `line_total`, `partner_name`) |
| Khoá chính | Danh mục = `varchar(36)` UUID sinh bằng `@PrePersist`; Kho/Users = `bigserial`/`BIGSERIAL` |
| Index | `uq_<bảng>_<cột>_lower`, `idx_<bảng>_<cột>`, `idx_<bảng>_<cột>_trgm` |
| Migration | `V<5 số>__mo_ta_ngan.sql` (`V00005__document.sql`) |
| **Tiền tố mã danh mục** | NCC (nhà cung cấp), KH (khách hàng), VT (vật tư), NH (ngân hàng – chỉ ở mock), TK (TK kế toán – chỉ ở mock) |
| Số phiếu kho | `PN` (nhập) / `PX` (xuất) / `PT` (trả) + `%04d`, ví dụ `PN0001` |
| Loại phiếu | hằng chuỗi tiếng Anh: `import` / `export` / `return` |
| Vai trò | `admin` / `user` (chữ thường; DB mặc định `USER` — được `normalizeRole()` hạ về `user`) |

---

## 6. CODING STANDARDS — QUY CHUẨN CODING

### 6.1 Backend (bắt buộc)

**Nên:**
1. Thêm danh mục mới = **tạo 1 Entity + 1 Resource kế thừa `MasterResource` + 1 migration**. Không viết lại CRUD.
2. Mọi thao tác ghi (`POST/PUT/DELETE`) phải `@Transactional` và gọi `flushOrConflict(...)` để đổi lỗi unique/FK thành **409** thay vì 500.
3. Mọi tham số sắp xếp phải đi qua **whitelist `sortable()`** — không ghép chuỗi từ input người dùng vào JPQL.
4. Mọi giá trị lọc phải dùng **named parameter** qua `Where.and(cond, name, value)` — không nối giá trị.
5. Validate ở **server** (`validate()`), không tin dữ liệu từ FE; thông báo lỗi **tiếng Việt, có nghĩa**.
6. Lỗi nghiệp vụ trả `{"message": ...}` kèm HTTP status đúng (400/404/409).
7. Dùng `@Path` danh từ số nhiều; thêm hành động đặc biệt dạng `POST /<resource>/<action>` (mẫu `bulk-delete`).
8. Thay đổi schema ⇒ thêm file Flyway mới `V0000X__*.sql`.
9. Comment tiếng Việt ở chỗ có đánh đổi/giới hạn (mẫu có sẵn trong `MasterResource.nextCode`, `InvDocResource.create`).
10. Giữ `@Authenticated` (thêm `@RolesAllowed` nếu cần chặn theo vai trò) trên mọi Resource nghiệp vụ.

**Không nên:**
1. ❌ Tạo `XxxRepository`, `XxxController`, `XxxMapper` (MapStruct) — không thuộc kiến trúc này.
2. ❌ Trả Entity ra ngoài khi có field nhạy cảm (`User.password`!) — phải dùng DTO hoặc `@JsonIgnore`.
3. ❌ Trả 500 cho lỗi người dùng có thể sửa được (validate/trùng mã).
4. ❌ Dùng `em.createNativeQuery` khi JPQL đủ; nếu buộc phải native (vd. `UPDATE … RETURNING last_no` của `inv_doc_counter`) thì phải có comment giải thích.
5. ❌ Nhân bản logic: nếu ≥2 Resource cùng điều kiện lọc ⇒ nâng lên `MasterResource` hoặc `static` helper dùng chung (mẫu `SupplierResource.phoneFilter`).
6. ❌ Đặt logic nghiệp vụ trong Resource nếu có transaction phức tạp/tái sử dụng ⇒ đưa vào `service/`.
7. ❌ Sửa trực tiếp file migration đã phát hành.

### 6.2 Frontend (bắt buộc)

**Nên:**
1. Tính năng mới = **plugin mới** `src/plugins/<id>/index.jsx` + key i18n riêng; máy móc đăng ký tự động (§3.2).
2. Truy cập dữ liệu qua **store/API client**, không `fetch` trực tiếp trong component.
3. Mọi nút ghi/sửa/xoá phải `disabled: !can('<id>', '<action>')`; View phải chặn `can('<id>','read')` bằng `<Denied/>`.
4. Mọi chuỗi hiển thị qua `t()`; khai báo cả `vi` + `en`.
5. Mọi thao tác nguy hiểm qua `useConfirm()`; mọi thao tác async phải có cờ `busy/saving` chống double-click.
6. Luôn xử lý 3 trạng thái: **loading** (`<Loading/>`), **error** (banner `role="alert"` + nút *Thử lại*), **empty** (`.empty` phân biệt "chưa có dữ liệu" vs "không có kết quả").
7. Ghi state tạm bằng `{replace: true}`; điều hướng thật không truyền `replace`.
8. Tái sử dụng `Autocomplete`, `useConfirm`, `Loading/Spinner`, `Denied`, `vnd`, store factory; đặt hook ở component con có `key` khi View có early-return.
9. Nút chỉ có icon phải có `title` + `aria-label`; dùng `aria-busy`, `aria-sort`, `role="alert"`, `role="status"` như code hiện có.
10. Import module nội bộ ghi rõ đuôi `.js`/`.jsx`.

**Không nên:**
1. ❌ Thêm thư viện UI/router/state (Redux, react-router, axios, MUI…) — repo cố tình thuần React + CSS + fetch.
2. ❌ Sửa `webui-v1` khi yêu cầu nói về ứng dụng thực.
3. ❌ Đưa dữ liệu lớn vào `state` của plugin (state nằm trong URL hash).
4. ❌ Dùng `alert`/`window.confirm`/`prompt` cho luồng mới (chỉ có trong plugin legacy + vài chỗ tạo nhanh danh mục).
5. ❌ Copy-paste component giữa `catalog` và `inventory` (HeaderCheck/Pager/Toolbar đang trùng — xem §7).
6. ❌ Lưu token vào `localStorage` (token nằm trong HttpOnly cookie; chỉ cache `user` để render nhanh).
7. ❌ Tin `role` phía client là bảo mật — quyền thật phải kiểm ở server.
8. ❌ Bỏ sót: quên `credentials:'include'` (cả 2 client đã có sẵn — dùng client, đừng tự `fetch`).

### 6.3 Bảo mật (checklist khi thêm tính năng)

- [ ] Endpoint mới có `@Authenticated` / `@RolesAllowed` chưa?
- [ ] Ghi dữ liệu danh mục có nên giới hạn `admin` không? (`@RolesAllowed("admin")` trên POST/PUT/DELETE)
- [ ] Có trả về field nhạy cảm (mật khẩu, token) trong JSON không?
- [ ] Cookie: khi triển khai HTTPS phải đổi `secure(true)` trong `AuthResource`.
- [ ] Có nhận chuỗi từ client ghép vào JPQL/SQL không? (phải dùng whitelist + named param)
- [ ] File `.pem`/`.jwk`/`.env` có bị commit không? (đã bị `.gitignore` — giữ nguyên)
- [ ] Bí mật production không để mặc định trong `application.properties` (`laravel/secret` chỉ dùng dev).

### 6.4 Hiệu năng (checklist)

- [ ] `GET` list lớn phải **có `page/pageSize`** (không phân trang ⇒ chặn 10 000 dòng trong RAM).
- [ ] Tìm kiếm mờ dựa vào index `gin_trgm` đã tạo ⇒ giữ `lower(col) like %q%` (đừng đổi sang cast/`upper`).
- [ ] Tránh N+1: phiếu kho `@OneToMany` mặc định LAZY theo field access; khi mở rộng, cân nhắc `join fetch` cho `lines`.
- [ ] FE: gõ tìm kiếm phải debounce (`useDebounced`/250ms) và huỷ request cũ (`useAsyncQuery` đã lo).
- [ ] Format tiền **chỉ** lúc render (`vnd`), không format rồi lưu vào state/URL.
- [ ] `state` plugin càng nhỏ càng tốt (state nằm trong URL, đổi state = đổi history entry).

### 6.5 Git / môi trường / tài liệu

- Không commit: `target/`, `node_modules/`, `.env`, `.env.local`, `privateKey.pem`, `publicKey.pem`, `rsaPrivateKey.pem` (đã có trong `.gitignore`).
- Thay đổi lớn phải cập nhật **`CHANGELOG.md`** theo [Keep a Changelog](https://keepachangelog.com/) (Added/Fixed/Changed), và cập nhật `COMPONENT_MAPPING.md` nếu thêm component/module.
- `PROJECT_STATUS.md` dùng để theo dõi tiến độ phân hệ.

### 6.6 Công thức copy-paste: thêm một danh mục mới (ví dụ `Warehouse`)

```text
1. src/main/resources/db/migration/V00006__warehouse.sql
     CREATE TABLE warehouses (id VARCHAR(36) PRIMARY KEY, code VARCHAR(50), name VARCHAR(255) NOT NULL,
                              address VARCHAR(500));
     CREATE UNIQUE INDEX uq_warehouses_code_lower ON warehouses (LOWER(code)) WHERE code IS NOT NULL;
     CREATE INDEX idx_warehouses_name_lower ON warehouses (LOWER(name));
     CREATE INDEX idx_warehouses_name_trgm  ON warehouses USING gin (LOWER(name) gin_trgm_ops);

2. entity/Warehouse.java
     @Entity @Table(name = "warehouses")
     public class Warehouse extends MasterEntity { public String address; }

3. resource/WarehouseResource.java
     @Path("/warehouses")
     public class WarehouseResource extends MasterResource<Warehouse> {
         protected Class<Warehouse> type() { return Warehouse.class; }
         protected List<String> searchFields() { return List.of("code", "name", "address"); }
         protected String codePrefix() { return "KHO"; }
     }

4. core/masterdata.js   → export const warehousesStore = makeStore('KHO', '/warehouses', []);

5. plugins/catalog/index.jsx → thêm vào CATS, schemaFor(), filtersFor(), IMPORT_SPEC (nếu cho import CSV)

6. messages trong plugins/catalog/index.jsx: thêm key 'cat.warehouses' cho CẢ vi và en

7. core/permissions.js: không cần sửa (phân quyền theo plugin 'catalog', không theo từng danh mục)
```

### 6.7 Công thức: thêm một plugin nghiệp vụ mới

```text
1. src/main/webui/src/plugins/<id>/index.jsx
     export default { id, title, icon, order, initialState, messages, search, Menu, ribbon, View }
2. messages: { vi: { '<pfx>.title': …, '<pfx>.empty': … }, en: { … } }     (cả hai ngôn ngữ)
3. Nếu cần REST: src/main/webui/src/api/<domain>Api.js (dùng http.js)
   hoặc thêm store vào core/masterdata.js nếu là danh mục đơn giản
4. core/permissions.js: thêm '<id>' vào PLUGIN_IDS + DEFAULT (nếu plugin có CRUD)
5. plugins/index.js: KHÔNG cần sửa (import.meta.glob tự tìm) — trừ khi muốn đưa vào SKIPPED_PLUGINS
6. Backend: Resource (@Path("/<plural>")) + Entity + migration; là danh mục thì kế thừa MasterResource
7. Cập nhật COMPONENT_MAPPING.md + CHANGELOG.md
```

---

## 7. RECOMMENDATIONS — KHUYẾN NGHỊ

> Không có thay đổi mã nguồn nào được thực hiện (theo yêu cầu prompt: *"Do not modify application code"*). Dưới đây là danh sách việc cần làm, đã đối chiếu từng dòng code.

### 7.1 🔴 P0 — Bảo mật & tính đúng đắn (nên xử lý trước)

| # | Vấn đề | Bằng chứng | Khuyến nghị |
| :- | :--- | :--- | :--- |
| 1 | **`InvDocResource` không được bảo vệ** — thiếu `@Authenticated`/`@RolesAllowed`, trong khi mọi endpoint danh mục đều yêu cầu JWT ⇒ bất kỳ ai cũng GET/POST/PUT/DELETE phiếu kho | `InvDocResource.java:28-30` (chỉ có `@Path/@Produces/@Consumes`) | Thêm `@Authenticated` ở class; `@RolesAllowed("admin")` cho `bulk-delete` |
| 2 | **Ghi danh mục không phân quyền** — bất kỳ user đã đăng nhập đều POST/PUT/DELETE 6 danh mục; ma trận `can()` chỉ là "trang trí" phía client | `MasterResource.java:46` (comment tự nhận *"muốn chỉ admin được ghi thì thêm @RolesAllowed("admin")"*) | Ghi đè `create/update/delete` trong lớp con hoặc tách `MasterWriteResource` có `@RolesAllowed("admin")`; đồng bộ ma trận quyền xuống DB |
| 3 | **`/api/auth/register` trả về entity `User` (có `password` hash)** ⇒ rò rỉ hash mật khẩu | `AuthResource.register` → `.entity(user)` | Trả DTO `{username, role}` hoặc thêm `@JsonIgnore` vào `User.password` |
| 4 | **`/api/auth/login` trả token giả** `UUID.randomUUID()` không phải JWT ⇒ endpoint "chết" nhưng vẫn public, gây hiểu nhầm & nguy cơ bị dùng sai | `AuthService.login()` + `AuthResponse` | Xoá `login()`/`AuthResponse` (chỉ giữ `loginv1`) hoặc chuyển sang JWT; xoá luôn `AuthResource.unauthorized()` (unused) |
| 5 | **`SecurityFilter` gây nhiễu log & trùng lặp trách nhiệm**: `System.out.println` mọi request; path-check bằng `contains("auth")` (lỏng, có thể bỏ qua nhầm); phần xác minh token đã comment, chỉ kiểm tra "cookie có tồn tại" | `SecurityFilter.java:27`, `:32`, `:50-55` | Xoá filter (để Quarkus `@Authenticated` + `mp.jwt.*` làm việc) **hoặc** giữ nhưng: dùng `Logger` + level DEBUG, so khớp path chính xác, và verify chữ ký |
| 6 | **Cookie `secure=false`** | `AuthResource.loginv1/logout` | Đổi thành `true` khi chạy HTTPS (đưa vào config `%prod`) |
| 7 | **Sinh số phiếu có thể trùng khi đồng thời** — `InvDoc.count("type", d.type) + 1` | `InvDocResource.java:39` + comment tự nhận | Dùng `inv_doc_counter` đã tạo sẵn trong `V00005` (`UPDATE … SET last_no=last_no+1 … RETURNING last_no`) — đúng như chú thích ở cuối file migration |
| 8 | **`PUT` phiếu kho xoá & tạo lại toàn bộ dòng** ⇒ tăng id liên tục, mất mốc thời gian của line, tăng tải | `InvDocResource.update` (`d.lines.clear()` + add lại) | Cân nhắc merge theo `pos`/id; nếu chấp nhận thì ghi rõ trong tài liệu |
| 9 | **Lệch kiểu dữ liệu JPA ↔ DB**: `InvLine.qty`/`price` là `long` nhưng DB là `numeric(18,3)`/`numeric(18,2)` | `InvLine.java:33-34` vs `V00005__document.sql:44-45` | Đổi sang `BigDecimal` cho `qty/price/lineTotal` để không mất phần thập phân |
| 10 | **Thiếu validate ở server cho phiếu kho** — `partner_name` NOT NULL trong DB nhưng `create()` không kiểm tra ⇒ gửi `partner: null` sẽ trả 500 | `V00005__document.sql:19` vs `InvDocResource.create` | Validate: `type` hợp lệ, `partner.id/name` bắt buộc, `lines` không rỗng, `qty > 0`, `price >= 0` → 400 `{"message":…}` |
| 11 | **`GET /api/inventory/docs` không có search/filter/phân trang** → FE tải hết rồi lọc ở client | `InvDocResource.list()` (`listAll`) | Áp cùng hợp đồng `q/page/pageSize/sort/dir/type/dateFrom/dateTo` như `MasterResource` (đã là *Next step* trong `PROJECT_STATUS.md`) |

### 7.2 🟠 P1 — Dọn dẹp & nhất quán (giảm rủi ro sửa nhầm)

| # | Vấn đề | Bằng chứng | Khuyến nghị |
| :- | :--- | :--- | :--- |
| 12 | **8 file backup/duplicate còn trong cây nguồn** | `plugins/inventory/index copy.jsx`, `index copy 2.jsx`; `plugins/catalog/index copy.jsx`, `index copy 2.jsx`, `index copy 3.jsx`; `core/Autocomplete copy.jsx`, `Autocomplete copy 2.jsx`; `core/router copy 2.js`; thêm `core/router-3.js` | Xoá (đã ghi trong `PROJECT_STATUS.md` §4.2) |
| 13 | **`inventoryApi.js` bị nhân đôi** ở `src/api/` và `src/core/`; plugin inventory lại import bản `core/` | `plugins/inventory/index.jsx:7` → `../../core/inventoryApi.js` | Giữ **một** bản ở `src/api/inventoryApi.js`, sửa import, xoá bản `core/` |
| 14 | **Dependency thừa/trùng trong `pom.xml`**: `quarkus-qute` khai báo **2 lần**, `commons-dbutils` không nơi nào dùng, không có template Qute nào trong `resources` | `pom.xml:36-39` & `:59-62`; grep `dbutils` = 0 kết quả; không có `.html` template | Xoá cả 3 khai báo |
| 15 | **`model/User.java` là class chết** (trùng tên `entity.User`) | không file nào import `com.ketoan.model` | Xoá |
| 16 | **Hàm/hằng chết ở FE**: `matchName`, `configureHttp`, và fallback token `localStorage.getItem('token')` (không còn dùng vì auth bằng cookie) | `masterdata.js:7`, `http.js:13-19` | Xoá để tránh hiểu nhầm "còn dùng token" |
| 17 | **`http.js` gắn `Authorization: Bearer` từ localStorage** — không cần thiết & gợi lại cơ chế token cũ | `http.js:22,31` | Bỏ, chỉ giữ `credentials: 'include'` |
| 18 | **`auth.jsx` còn khối `TEMP_ROLES`** với comment *"Xóa khi đã có /me"* nhưng `/me` đã có | `auth.jsx:14-17`, `:67` | Xoá nhánh fallback TEMP_ROLES |
| 19 | **`core/api.js` chứa `fakeApi` + `useApi`**, trùng chức năng với `useasyncquery.js`; `fakeApi` chỉ còn plugin legacy dùng | `api.js` vs `useasyncquery.js` | Chọn 1 hook tải dữ liệu; nếu xoá plugin legacy (mục 20) thì xoá `fakeApi`/`useApi` |
| 20 | **4 plugin đã viết nhưng bị `SKIPPED_PLUGINS` ẩn** (mail/calendar/people/tasks) và vẫn được nhắc trong `admin`/`permissions` | `plugins/index.js:3`; `admin/index.jsx:4`; `permissions.js:11-14` (comment) | Quyết định dứt điểm: hoặc kết nối API + bật, hoặc chuyển ra nhánh `legacy/` và xoá khỏi `NAMES` |
| 21 | **Code trùng giữa `catalog` và `inventory`**: `HeaderCheck`, `Pager`, `Toolbar`, sort/selection/CSV import (hàng trăm dòng) | `catalog/index.jsx:287-351` vs `inventory/index.jsx:373-…` | Trích ra `core/DataTable.jsx`, `core/csv.js`, `core/useDebounced.js`; gom `norm()` 3 bản về 1 |
| 22 | **CSS cục bộ nhúng trong JSX** (`<style>{CSS}</style>`) ở cả 2 plugin, kèm khối CSS bị comment | `catalog/index.jsx:250-262, 614-637`; `inventory` tương tự | Chuyển vào `styles.css` (dùng biến `--brand/…`) để có 1 nguồn duy nhất |
| 23 | **Dữ liệu kho không được reset khi logout** ⇒ user sau thấy dữ liệu user trước | `resetAllStores()` chỉ gồm 6 danh mục (`masterdata.js:155`) | Thêm `resetDocs()` cho module kho và gọi trong `auth.logout()` |
| 24 | **`webui-v1` (React 19 + Fluent UI + Vite 8) tồn tại song song** nhưng không được Quinoa build; có `node_modules` riêng | `webui-v1/package.json`; không có cấu hình Quinoa trỏ tới | Chuyển sang nhánh/`docs/` hoặc xoá để tránh nhầm lẫn & giảm dung lượng repo |
| 25 | **`cookies.txt` ở gốc repo** (rác từ `curl -c cookies.txt` trong README) và **không** nằm trong `.gitignore` | `cookies.txt` (219 bytes); `.gitignore` không có | Xoá và thêm vào `.gitignore` |
| 26 | **`README.md` hướng dẫn `docker compose up -d postgres` nhưng repo không có file compose** | `README.md:80-82`; repo không có file `*compose*` | Bổ sung `compose.yaml` (postgres 15 + pgadmin) vào repo |

### 7.3 🟡 P2 — Kiến trúc, hạ tầng, kiểm thử

| # | Vấn đề | Bằng chứng | Khuyến nghị |
| :- | :--- | :--- | :--- |
| 27 | **Test không chạy trong build** (`skipTests=true`, `skipITs=true`) và **test hiện có sai địa chỉ** — gọi `/danhmuc` (không tồn tại) | `pom.xml:16-17`; `DanhMucTaiKhoanResourceTest.java:14` | Đặt `skipTests=false` (hoặc chỉ bỏ ở profile `release`); viết lại test cho `/api/auth/loginv1`+`/me`, CRUD 1 danh mục, `/api/inventory/docs` |
| 28 | **Dockerfile có thể không khớp cấu hình đóng gói**: pom đặt `quarkus.package.type=uber-jar` nhưng Dockerfile copy `target/quarkus-app/` và chạy `quarkus-run.jar` (đúng cho `fast-jar`) | `pom.xml:20` vs `Dockerfile:10-11`; trong `target/` hiện chỉ có `quarkus-app-dev.jar` | Bỏ `quarkus.package.type=uber-jar` để dùng `fast-jar` mặc định (khớp Dockerfile) **hoặc** sửa Dockerfile theo uber-jar |
| 29 | **Log DEBUG bật mặc định ở mọi môi trường** (`io.quarkus.security`, `io.smallrye.jwt`, `org.jose4j`, `io.agroal`) | `application.properties:21-24` | Đưa vào `%dev.` / `%test.`; production chỉ để `INFO` |
| 30 | **Cấu hình trùng lặp/hardcode**: `issuer` xuất hiện ở cả `application.properties` và `AuthService.ISSUER`; `secure(false)` lặp ở 2 method | `application.properties:64`, `AuthService.java:19` | Đọc từ `@ConfigProperty`; đưa `secure`/`maxAge` thành hằng số dùng chung |
| 31 | **`quarkus.http.auth.permission.public-ui.paths=/*` + `policy=permit`** mở toàn bộ path ở tầng policy ⇒ an toàn hiện chỉ nhờ `@Authenticated` trên từng resource | `application.properties:8-9` | Giữ nhưng ghi rõ: **mọi Resource mới BẮT BUỘC có `@Authenticated`** |
| 32 | **Phân quyền chỉ ở `localStorage`** — admin tick xong, user khác/máy khác không thấy; xoá localStorage là mất | `permissions.js:20-30` | Thêm bảng `permissions(role, plugin_id, action)` + Resource `/permissions`, và `/me` trả kèm ma trận quyền |
| 33 | **FE chưa có lint/test**: `webui` không có script `lint`/`.eslintrc` (chỉ `webui-v1` có) | `webui/package.json` chỉ có `dev`/`build` | Thêm ESLint (theo mẫu `webui-v1/eslint.config.js`) + Vitest/Testing Library cho store & util thuần |
| 34 | **`useDebounced` chỉ nằm trong `catalog`** nhưng `Toolbar` của `inventory` cũng cần debounce | `catalog/index.jsx:100-107` | Nâng lên `core/` khi refactor mục 21 |
| 35 | **`MasterResource.nextCode()` không an toàn đa tiến trình** (tự nhận trong comment) | `MasterResource.java:172-179` | Chấp nhận cho 1 instance; khi scale: sequence DB + `UNIQUE(LOWER(code))` (đã có) và retry |
| 36 | **`GET` không tham số trả tối đa 10 000 dòng** — vượt ngưỡng sẽ im lặng cắt bớt | `MasterResource.java:83,106` | Thêm `all=true` có kiểm soát hoặc trả cờ `truncated: true` |
| 37 | **`AuthRequest` không validate rỗng** — `username`/`password` null sẽ NPE khi băm | `AuthService.generateToken` | Kiểm tra `blank` → 400 `{"message":…}` |
| 38 | **`sql/sql-0001.sql`** tồn tại song song Flyway | `sql/sql-0001.sql` | Ghi chú rõ "chỉ tham chiếu"; tránh chạy tay gây lệch `flyway_schema_history` |

### 7.4 Lộ trình đề xuất

| Sprint | Nội dung |
| :--- | :--- |
| **S1 – Bịt lỗ hổng** | #1, #2, #3, #4, #5, #6 (bảo mật) + #10, #11 (đúng đắn phiếu kho) |
| **S2 – Dọn dẹp** | #12, #13, #14, #15, #16, #17, #18, #25 (xoá rác, tránh sửa nhầm) |
| **S3 – Kiểm thử & CI** | #27 (test thật), #33 (lint/test FE), #28 (Dockerfile), #26 (compose) |
| **S4 – Refactor** | #21, #22, #34 (DataTable/CSS dùng chung), #23 (reset kho), #19, #20, #24 |
| **S5 – Nâng cấp** | #32 (phân quyền trong DB), #9 (BigDecimal), #29, #30, #36 |

### 7.5 ⚠️ Tài liệu cũ đang SAI — cần sửa

| File | Vấn đề | Hành động |
| :--- | :--- | :--- |
| `.ai/PROJECT_GUIDE.md` | Mô tả stack **Spring Boot + MapStruct + Axios + React Router**; tên `CustomerController/CustomerService/CustomerRepository/CustomerPage.jsx` — **không có** trong repo | ✅ **Đã cập nhật** trong cùng lần làm việc này để trỏ về `PROJECT_GUIDE.md` (gốc) và ghi đúng stack |
| `.ai/prompts/05-code-review.md`, `06-create-module.md`, `08-create-java-api.md` | Yêu cầu "Spring Boot API", "Repository", "MapStruct", "Controller" | Sửa prompt thành *Quarkus Resource / Entity Panache / Service (tuỳ chọn)* để AI không sinh code sai kiến trúc |
| `COMPONENT_MAPPING.md` §2.2 & §5.2 | Còn viết inventory dùng `SEED_DOCS`/`fakeApi` (đã bỏ) và `V00005` "cần chuẩn hoá khóa ngoại" (đã vá) | Cập nhật theo `CHANGELOG.md` |
| `PROJECT_STATUS.md` | Ghi "build uber-jar thành công" trong khi Dockerfile giả định `fast-jar` | Thống nhất sau khi xử lý mục #28 |

---

## PHỤ LỤC — Tra cứu nhanh: "muốn sửa X ⇒ đọc file nào"

| Muốn sửa… | Backend | Frontend |
| :--- | :--- | :--- |
| Đăng nhập / JWT / cookie / logout | `resource/AuthResource.java`, `service/AuthService.java`, `application.properties` (`mp.jwt.*`) | `core/auth.jsx`, `core/Login.jsx`, `core/api.js` |
| Phân quyền / ai được làm gì | `MasterResource` (annotation class) | `core/permissions.js`, `plugins/admin/index.jsx`, `core/Shell.jsx` (`can`) |
| CRUD danh mục (mọi danh mục) | `resource/MasterResource.java` + Resource/Entity tương ứng | `plugins/catalog/index.jsx`, `core/masterdata.js`, `core/createstore.js`, `core/mockstore.js` |
| Phiếu kho | `resource/InvDocResource.java`, `entity/InvDoc.java`, `entity/InvLine.java`, `db/migration/V00005__document.sql` | `plugins/inventory/index.jsx`, `src/api/inventoryApi.js`, `core/Autocomplete.jsx` |
| Ribbon / Rail / Sidebar / Topbar | — | `core/Shell.jsx`, `core/ribbon.jsx` |
| Thêm chuỗi tiếng Việt/Anh | — | `messages` trong plugin + `core/i18n.jsx` |
| Điều hướng / Back–Forward | — | `core/router.js` |
| Tìm kiếm toàn cục | — | `core/GlobalSearch.jsx` + `search()` của từng plugin |
| Đóng gói / dev server / proxy | `pom.xml` (`quarkus-quinoa`), `application.properties` (`quarkus.quinoa.*`) | `webui/vite.config.js`, `webui/.env.local` |
| Schema DB | `db/migration/V0000X__*.sql` (**thêm mới**, không sửa file cũ) | — |

---

**Kết luận:** dự án là **monolith Quarkus 3 + 1 SPA nhúng (Quinoa)**, kiến trúc thực tế **không có tầng Repository / MapStruct / Axios / React Router** như các prompt mẫu giả định.

**Điểm mạnh:** `MasterResource<T>` generic + store layer 2 chế độ (mock/real) + plugin registry ⇒ thêm module mới rất nhanh, backend gần như không trùng lặp CRUD.

**Điểm yếu cần xử lý trước:** bảo mật của `InvDocResource` và quyền ghi danh mục (**P0**), cùng 8 file backup + 3 dependency thừa đang gây nhiễu khi bảo trì (**P1**).

