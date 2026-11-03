# IMPLEMENTATION_REPORT.md — Áp dụng Fix A (doc_id NOT NULL)

> **Ngày:** 17/10/2026 · **Nguồn:** [`DEBUG_REPORT.md`](./DEBUG_REPORT.md) §10 – **Fix A** · **Dự án:** `com.ketoan:quarkus-app`
> **Trạng thái:** ✅ Đã implement · ✅ Build pass · ✅ App chạy · ✅ curl test pass (CREATE/PUT/GET/DELETE) · ✅ `doc_id` có giá trị · ✅ thứ tự dòng đúng
> **Tuân thủ yêu cầu:** không làm Fix B · không refactor ngoài phạm vi · không đổi business behavior · chỉ sửa file cần cho Fix A.

---

## 1. TL;DR

| Hạng mục | Kết quả |
| :--- | :--- |
| Số file sửa | **3** (`InvDoc.java`, `InvLine.java`, `InvDocResource.java`) |
| Migration | **Không** (schema `doc_id`/`pos` đã đúng) |
| Trước fix | `POST` = **500**, `PUT` = **500** (`null value in column "doc_id"`) |
| Sau fix | `POST` = **201**, `PUT` = **200**, `GET` = 200, `DELETE` = 204 |
| SQL sinh ra | `insert into inv_doc_line (doc_id,pos,price,product_id,product_name,qty)` — **có `doc_id` + `pos`** (1 câu/dòng, không còn UPDATE bù) |
| `doc_id` NULL | **0 dòng** |
| Thứ tự dòng | Tạo A,B,C ⇒ `pos 0,1,2`; PUT đảo C,A,B ⇒ `pos 0,1,2` đúng thứ tự mới |
| Sự cố phát sinh khi test | PUT vi phạm `UNIQUE(doc_id,pos)` ⇒ đã xử lý bằng `em.flush()` sau `clear()` (vẫn trong phạm vi Fix A) |

---

## 2. PHẠM VI & GIẢI THÍCH TỪNG FILE (yêu cầu #4)

| # | File | Vì sao **phải** sửa | Nội dung thay đổi |
| :- | :--- | :--- | :--- |
| 1 | `src/main/java/com/ketoan/entity/InvDoc.java` | Nơi khai báo quan hệ `1–n` **sai phía sở hữu**: `@JoinColumn`/`@OrderColumn` đặt trên collection khiến Hibernate bỏ `doc_id`/`pos` khỏi INSERT của con | `@OneToMany(mappedBy = "doc", cascade = ALL, orphanRemoval = true)` + `@OrderBy("pos asc")`; bỏ `@JoinColumn` + `@OrderColumn` |
| 2 | `src/main/java/com/ketoan/entity/InvLine.java` | `InvLine` chưa map `doc_id` (FK NOT NULL) và `pos` (NOT NULL) ⇒ không thể là bên sở hữu | Thêm `@ManyToOne(fetch=LAZY, optional=false) @JoinColumn(name="doc_id", nullable=false) @JsonIgnore public InvDoc doc;` + `public int pos;` (+4 import) |
| 3 | `src/main/java/com/ketoan/resource/InvDocResource.java` | Với quan hệ 2 chiều, `doc`/`pos` **phải** được gán trước khi flush; khi thay thế dòng phải xoá cũ **trước** khi chèn mới (`UNIQUE(doc_id,pos)`) | Helper `linkLines(doc, lines)` dùng ở `create()`/`update()`; `em.flush()` sau `d.lines.clear()`; thêm `import com.ketoan.entity.InvLine;` |

**Không sửa:** `V00001–V00006` (schema), kiểu `long`↔`numeric` (nợ P0 #9), FE, service, cấu hình, endpoint/response shape.

---

## 3. CHI TIẾT THAY ĐỔI

### 3.1 `InvDoc.java`

```java
// TRƯỚC
@OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
@JoinColumn(name = "doc_id") @OrderColumn(name = "pos")   // giữ thứ tự kéo thả
public List<InvLine> lines = new ArrayList<>();

// SAU
@OneToMany(mappedBy = "doc", cascade = CascadeType.ALL, orphanRemoval = true)
@OrderBy("pos asc")   // thứ tự kéo thả: cột pos do InvLine.pos quản lý (InvLine sở hữu doc_id + pos)
public List<InvLine> lines = new ArrayList<>();
```

* `mappedBy="doc"` ⇒ collection là phía **nghịch** ⇒ Hibernate không còn "ghi FK sau".
* `@OrderBy("pos asc")` ⇒ thứ tự đọc theo cột thật `pos`.
* Giữ `cascade=ALL` + `orphanRemoval=true` ⇒ nghiệp vụ "lưu = thay thế toàn bộ dòng" **không đổi**.

### 3.2 `InvLine.java`

```java
@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "doc_id", nullable = false)
@JsonIgnore                       // tránh vòng lặp JSON: InvDoc.lines → InvLine.doc → …
public InvDoc doc;

public int pos;                   // cột pos NOT NULL, UNIQUE(doc_id,pos); app gán = index trong mảng
```
Import thêm: `JsonIgnore`, `FetchType`, `JoinColumn`, `ManyToOne`.

### 3.3 `InvDocResource.java`

```java
private static void linkLines(InvDoc doc, List<InvLine> lines) {
    for (int i = 0; i < lines.size(); i++) {
        InvLine l = lines.get(i);
        l.id = null;                                    // server cấp id (BE-P7)
        l.doc = doc;                                    // ⇒ cột doc_id được ghi trong INSERT
        l.pos = i;                                      // ⇒ cột pos được ghi trong INSERT
        if (!doc.lines.contains(l)) doc.lines.add(l);    // đồng bộ 2 chiều (update: đang duyệt in.lines)
    }
}
```
```java
// create(): thay "d.lines.forEach(l -> l.id = null);"
linkLines(d, d.lines);

// update(): sau clear phải flush để xoá dòng cũ trước khi chèn dòng mới
if (!d.lines.isEmpty()) {
    d.lines.clear();
    em.flush();     // tránh UNIQUE(doc_id, pos) khi pos mới trùng pos cũ (0..n-1)
}
linkLines(d, in.lines);
```

**Vì sao cần `em.flush()` (phát hiện khi test):** với `mappedBy` + `orphanRemoval`, khi `clear()` + thêm dòng mới trong cùng flush, Hibernate chèn dòng mới **trước** khi xoá dòng cũ ⇒ trùng `(doc_id, pos)`. Flush ngay sau `clear()` buộc DELETE chạy trước.

---

## 4. BUILD

```bash
export JAVA_HOME=~/.sdkman/candidates/java/21.0.12+1.1-tem
./mvnw -o -q compile        # COMPILE_EXIT=0
```
✅ (chạy 2 lần: sau Fix A và sau khi thêm `em.flush`). Không có lỗi/warning biên dịch mới.

---

## 5. CHẠY APP & KIỂM CHỨNG (yêu cầu #5)

**Môi trường tách biệt** (không đụng dev/DB của bạn):

| | |
| :--- | :--- |
| DB | container `postgres:15` tên `ketoan-fixdb`, **port 55436**; Flyway tự áp `V00001…V00006` (9 phiếu mẫu) |
| App | `./mvnw -o quarkus:dev -Dquarkus.http.port=8099 -Dquarkus.datasource.jdbc.url=jdbc:postgresql://localhost:55436/ke_toan` |
| Auth | `POST /api/auth/loginv1` (admin/123) ⇒ cookie |
| Bằng chứng SQL | bật `log_statement='all'` trên **container tạm** ⇒ đọc `docker logs` |
| Dọn dẹp | dừng app (`kill`), `docker rm -f ketoan-fixdb` ✅ |

### 5.1 Kết quả từng bước

| Bước | Kỳ vọng | Kết quả thực tế | |
| :--- | :--- | :--- | :---: |
| 1. Login | 200 | `LOGIN=200` | ✅ |
| 2. Lấy 3 vật tư (FK) | 3 id | `7c957b49…`, `1c80b810…`, `b142349d…` | ✅ |
| 3. **POST** tạo phiếu 3 dòng A,B,C | 201 | `CREATE_HTTP=201`, `id=11`, `no=PN0004`, lines id 22/23/24 `pos 0/1/2` | ✅ |
| 4. **DB sau CREATE** | `doc_id` có giá trị, `pos 0,1,2` | `0\|Line-A\|11\|1.000\|100.00\|100.00`<br>`1\|Line-B\|11\|2.000\|200.00\|400.00`<br>`2\|Line-C\|11\|3.000\|300.00\|900.00` | ✅ |
| 5. Đếm dòng `doc_id IS NULL` | 0 | `0` | ✅ |
| 6. **GET list** thứ tự lines | A,B,C | `"Line-A"` → `"Line-B"` → `"Line-C"` | ✅ |
| 7. **PUT** đảo thứ tự C,A,B | 200 | `UPDATE_HTTP=200`, lines mới id 25/26/27, `pos 0/1/2` | ✅ |
| 8. **DB sau PUT** | pos 0=C,1=A,2=B; 3 dòng | `0\|Line-C\|11`<br>`1\|Line-A\|11`<br>`2\|Line-B\|11`<br>count = 3 | ✅ |
| 9. **GET lại** | C,A,B | `"Line-C"` → `"Line-A"` → `"Line-B"` | ✅ |
| 10. **DELETE** | 204, cascade xoá dòng | `DELETE_HTTP=204`; `lines_left=0`; `doc_left=0` | ✅ |

### 5.2 Bằng chứng SQL (PostgreSQL statement log)

```sql
-- CREATE (03:36:23.117 → .139): cha rồi 3 dòng, MỖI DÒNG 1 CÂU INSERT có doc_id + pos
insert into inv_doc (bank_id,bank_name,doc_date,no,note,partner_id,partner_name,type) values ($1..$8)
insert into inv_doc_line (doc_id,pos,price,product_id,product_name,qty) values ($1..$6)
insert into inv_doc_line (doc_id,pos,price,product_id,product_name,qty) values ($1..$6)
insert into inv_doc_line (doc_id,pos,price,product_id,product_name,qty) values ($1..$6)

-- PUT (03:36:23.632 → .641): XOÁ 3 dòng cũ TRƯỚC, rồi chèn 3 dòng mới
delete from inv_doc_line where id=$1   (×3)
insert into inv_doc_line (doc_id,pos,price,product_id,product_name,qty) values ($1..$6)   (×3)

-- DELETE phiếu
delete from inv_doc where id=$1        → cascade xoá inv_doc_line
```
> ❗ Không còn `update inv_doc_line set doc_id=…` — đúng bản chất Fix A.

---

## 6. TƯƠNG THÍCH HÀNH VI (không đổi nghiệp vụ)

| Hành vi | Trước | Sau | Kết luận |
| :--- | :--- | :--- | :--- |
| `POST /docs` | 500 (bug) | 201 + tạo cha & dòng | Sửa đúng lỗi |
| `PUT /docs/{id}` | 500 (bug) | 200, thay thế toàn bộ dòng như cũ | Không đổi nghiệp vụ |
| Cấp `id` / `no` | server cấp (`count+1`, PN/PX/PT) | y nguyên | Không đổi |
| `type`/`no` bất biến khi PUT | có | có (vẫn không copy `type`) | Không đổi |
| `line_total` | cột generated | y nguyên | Không đổi |
| Xoá phiếu | cascade xoá dòng | y nguyên (đã test `lines_left=0`) | Không đổi |
| `GET /docs` response | `{items,total}`, item có `lines` | y nguyên, **thêm** field `pos` mỗi dòng | Chỉ thêm dữ liệu, FE bỏ qua |
| JSON `lines[].doc` | không tồn tại | có field nhưng **`@JsonIgnore`** ⇒ không xuất hiện | Không đổi payload |
| Thứ tự dòng | không lưu được (NULL) | `pos 0..n-1` theo mảng FE gửi | Đúng thiết kế ban đầu |

---

## 7. SỰ CỐ PHÁT SINH TRONG QUÁ TRÌNH IMPLEMENT & CÁCH XỬ LÝ

| # | Hiện tượng | Nguyên nhân | Xử lý |
| :- | :--- | :--- | :--- |
| 1 | PUT ⇒ 500 `Key (doc_id, pos)=(11, 0) already exists` | Với `mappedBy` + orphanRemoval, Hibernate chèn dòng mới **trước** khi xoá dòng cũ trong cùng flush ⇒ trùng `UNIQUE(doc_id,pos)` | Thêm `em.flush()` ngay sau `d.lines.clear()` ⇒ xoá trước, chèn sau. Test lại: 200, DB đúng |

---

## 8. VẤN ĐỀ CÓ SẴN ĐƯỢC QUAN SÁT (ngoài phạm vi — KHÔNG sửa)

| # | Quan sát | Ghi chú |
| :- | :--- | :--- |
| 8.1 | Hibernate log **2 ERROR schema validation**: `wrong column type … column [price] … found [numeric], expecting [bigint]` (tương tự `qty`) | Nợ **P0 #9** (`InvLine.qty/price` = `long` ↔ DB `numeric`). Tồn tại **trước** Fix A; không ảnh hưởng chức năng |
| 8.2 | `lineTotal` trả `null` ngay sau POST/PUT | Cột generated chưa refresh; FE hiển thị `qty*price` nên không lộ ra người dùng |
| 8.3 | `GET /api/inventory/docs/{id}` vẫn **405** | Resource không có method GET theo id (`DEBUG_REPORT` §11.1) |
| 8.4 | Sinh số phiếu bằng `count(*)+1` | Việc riêng (P0 #7); `inv_doc_counter` đã sẵn sàng |
| 8.5 | `pom.xml` warning dependency trùng | Nợ có sẵn |

---

## 9. RÀNG BUỘC ĐÃ TUÂN THỦ (yêu cầu #1–#3, #7)

| Yêu cầu | Trạng thái |
| :--- | :--- |
| Không implement Fix B (DROP NOT NULL) | ✅ Không có migration/ALTER nào; `V00005` giữ `NOT NULL` |
| Giữ kiến trúc hiện có (Panache + `InvDocResource`, không Repository/Service mới) | ✅ |
| Chỉ sửa file cần cho Fix A | ✅ Đúng **3** file Java (kiểm tra timestamp) |
| Giải thích từng file trước khi sửa | ✅ §2 |
| Build → chạy app → curl → verify creation/`doc_id`/ordering | ✅ §4–§5 |
| Không refactor code không liên quan | ✅ |
| Không đổi business behavior | ✅ §6 |
| Tạo `IMPLEMENTATION_REPORT.md` + `BEFORE_AFTER.md` | ✅ |

---

## 10. VIỆC TIẾP THEO (đề xuất, chưa làm)

- [ ] **Sửa `.ai/RULES.md` BE-E9** — quy tắc này đang khuyến nghị đúng pattern gây bug (`@OneToMany + @JoinColumn + @OrderColumn` một chiều). Nên đổi thành: detail ⇒ `@ManyToOne @JoinColumn` ở con + `@OneToMany(mappedBy=…)` + `@OrderBy` + field `pos`.
- [ ] Cập nhật `.ai/modules/inventory-agent.md` §2/§3, `inventory-architect.md` §4 (vòng đời InvLine: 1 INSERT/dòng) + `CHANGELOG.md`.
- [ ] Test tích hợp (`@QuarkusTest`): POST 1/nhiều dòng, PUT đổi thứ tự 2 lần liên tiếp, DELETE cascade, case lỗi.
- [ ] Xử lý nợ P0 #9 (`BigDecimal`) để hết ERROR schema validation.

---

## 11. CÁCH TÁI LẬP KIỂM CHỨNG

```bash
docker run -d --name ketoan-fixdb -e POSTGRES_PASSWORD=secret -e POSTGRES_USER=laravel \
           -e POSTGRES_DB=ke_toan -p 55436:5432 postgres:15
./mvnw -o quarkus:dev -Dquarkus.http.port=8099 \
       -Dquarkus.datasource.jdbc.url=jdbc:postgresql://localhost:55436/ke_toan

curl -c /tmp/c.txt -X POST localhost:8099/api/auth/loginv1 \
     -H 'Content-Type: application/json' -d '{"username":"admin","password":"123"}'
curl -b /tmp/c.txt "localhost:8099/api/materials?page=1&pageSize=1"
# POST / PUT / GET / DELETE như §5.1 (script mẫu: /tmp/verify_fix*.sh trong phiên làm việc)
docker logs ketoan-fixdb 2>&1 | grep -E 'insert into inv_doc_line|delete from inv_doc_line'
```


