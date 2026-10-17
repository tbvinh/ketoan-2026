# Project Guide (Cline rules digest)

> **File đầy đủ & chính xác:** [`../PROJECT_GUIDE.md`](../PROJECT_GUIDE.md) — đọc file đó trước khi sinh code.
> Bản trong `.ai/` chỉ là bản tóm tắt "phải nhớ". Phiên bản: 16/10/2026.

## ⚠️ Stack THỰC TẾ (không phải Spring Boot)

| Hạng mục | Thực tế trong repo |
| :--- | :--- |
| Backend | **Quarkus 3.39.3**, Java 21, RESTEasy Reactive (Jakarta REST), Arc (CDI) |
| Persistence | Hibernate ORM **Panache** (`PanacheEntityBase`) + `EntityManager`/JPQL — **KHÔNG có tầng Repository** |
| Mapping | Jackson `ObjectMapper` — **KHÔNG dùng MapStruct** |
| DB | PostgreSQL 15 + **Flyway** (`V00001`…`V00005`), `quarkus.hibernate-orm.database.generation=none` |
| Auth | SmallRye JWT (RSA-2048) đọc từ **HttpOnly cookie `token`**, BCrypt |
| Frontend | **React 18 + Vite 5** (Quarkus Quinoa). **KHÔNG dùng Axios, KHÔNG dùng React Router** — `fetch` + hash-router tự viết |
| FE dữ liệu | Store layer (`core/masterdata.js` → `createstore.js`/`mockstore.js`) + plugin registry |

## Backend — luồng & quy ước

```
HTTP /api/**  →  Resource (@Path, "Controller")
                   ├─ (tuỳ chọn, chỉ Auth) Service (@ApplicationScoped, @Transactional)
                   └─ EntityManager JPQL (MasterResource) / Panache static API (InvDoc, User)
                          → PostgreSQL (schema do Flyway quản lý)
```

Rules:

- Lớp REST tên `XxxResource` (**không** phải `XxxController`); `@ApplicationPath("/api")` ở `config/RestApplication`.
- Danh mục mới ⇒ `Entity extends MasterEntity` + `Resource extends MasterResource<T>` + seed/extension trong `masterdata.js`. **Không viết lại CRUD.**
- Không tạo Repository / Mapper. Persistence: JPQL hoặc static API Panache.
- Ghi dữ liệu: `@Transactional` + `flushOrConflict(...)` ⇒ lỗi unique/FK trả **409**; validate lỗi trả **400 `{"message": …}`**; không tìm thấy **404**.
- Sort phải qua whitelist `sortable()`; filter phải dùng named parameter trong `Where` (chống JPQL injection).
- Resource nghiệp vụ **bắt buộc** `@Authenticated` (thêm `@RolesAllowed` khi cần).
- Sửa schema ⇒ **thêm file Flyway mới**, không sửa file cũ.
- Comment tiếng Việt ở chỗ có đánh đổi.

## Frontend — luồng & quy ước

```
main.jsx → import './plugins' (tự đăng ký mọi plugins/*/index.jsx)
         → Gate → Shell → plugin.View  (Page = Plugin)
                            └─ component con (Component)
                                 └─ store (core/masterdata.js / src/api/*Api.js)  (Service)
                                      └─ core/http.js | core/api.js → fetch /api/**   (API)
```

Rules:

- Tính năng mới = **plugin mới** `src/plugins/<id>/index.jsx` export default `{ id, title, icon, order, initialState, messages, search, Menu, ribbon, View }`.
- Chuỗi UI phải qua `t()` và khai báo **cả `vi` + `en`** trong `messages`.
- Quyền: `can('<id>','read'|'create'|'update'|'delete')` — chặn View bằng `<Denied/>`, disable nút ghi. Quyền thật phải kiểm ở **server**.
- Xác nhận nguy hiểm bằng `useConfirm()`; async phải có cờ `busy/saving`; luôn có trạng thái **loading / error / empty**.
- Điều hướng: `setState(patch)` cho điều hướng thật, `setState(patch, {replace:true})` cho thay đổi tạm (gõ từ khoá, tick chọn).
- Tái sử dụng `core/Autocomplete.jsx`, `core/confirm.jsx`, `core/ui.jsx`, `core/Denied.jsx`, `vnd()`; **không** thêm Axios/React Router/Redux/MUI.
- Không lưu token vào `localStorage` (cookie HttpOnly); không sửa `webui-v1` (bản thử nghiệm, Quinoa không build).

## Naming nhanh

| Loại | Mẫu |
| :--- | :--- |
| Java REST / Service / Entity / DTO | `CustomerResource` / `AuthService` / `Customer` / `AuthRequest` |
| Hook / Store / API client (FE) | `useAsyncQuery` / `customersStore` / `inventoryApi` (`src/api/inventoryApi.js`) |
| Plugin & i18n | thư mục `catalog` + key `cat.*`; thư mục `inventory` + key `inv.*` |
| REST | `/api/<danh từ số nhiều>` — `/api/suppliers`, `/api/inventory/docs` |
| DB | bảng `snake_case`, cột `snake_case`, index `uq_*/idx_*`, migration `V0000X__*.sql` |
| Mã nghiệp vụ | NCC, KH, VT, NH, TK · số phiếu `PN/PX/PT` + `%04d` (`PN0001`) |

## Việc cần làm trước khi nhận task mới

1. Mở `PROJECT_GUIDE.md` §7 — kiểm tra việc cần sửa có nằm trong danh sách khuyến nghị không (P0: bảo mật `InvDocResource`, quyền ghi danh mục).
2. Đọc **đúng các file liên quan** theo bảng "Tra cứu nhanh" ở phụ lục `PROJECT_GUIDE.md` (tránh quét cả cây thư mục).
3. Bỏ qua 8 file backup (`*copy*.jsx`, `router copy 2.js`, `router-3.js`) và `webui-v1` khi tìm code.
