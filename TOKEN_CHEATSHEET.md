# CHEATSHEET LÀM VIỆC TIẾT KIỆM TOKEN — KẾ TOÁN 2026

> File sổ tay ngắn gọn dành cho bạn mỗi khi quay lại dự án sau vài ngày/vài tuần.

---

## 1. Khi mới mở lại dự án (Bắt đầu phiên mới)

**❌ ĐỪNG LÀM:**
- Đừng bảo AI *"Hãy phân tích toàn bộ dự án"* hoặc copy prompt dài bắt đọc 5–6 file `.md` (`DEBUG_REPORT.md`, `SESSION.md`, `RULES.md`...).
- Đừng để 1 cuộc hội thoại kéo dài qua nhiều tính năng khác nhau.

**✅ NÊN LÀM:**
1. Mở xem nhanh [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) (mục **4. Kế hoạch các bước tiếp theo**) để nhớ mình đang làm tới đâu.
2. Mở xem bảng cuối file [`.ai/PROJECT_GUIDE.md`](./.ai/PROJECT_GUIDE.md) để biết tên file của phân hệ định sửa.
3. Gửi **Prompt ngắn 2–3 dòng** chỉ đích danh file cần đọc (xem mẫu ở mục 2 bên dưới).

---

## 2. Mẫu Prompt "Siêu Tiết Kiệm Token" (Copy & Điền)

### Mẫu 1: Sửa lỗi hoặc nâng cấp 1 phân hệ cụ thể (Tốn ~2k–4k token)
```text
Đọc .ai/PROJECT_GUIDE.md và chỉ đọc đúng file liên quan đến phân hệ [Tên phân hệ, vd: Kho / Tiền mặt].
Yêu cầu: [Mô tả ngắn gọn việc cần làm, vd: đổi sinh số phiếu trong InvDocResource.java sang dùng bảng inv_doc_counter].
Không quét thư mục, không đọc các file báo cáo cũ.
```

### Mẫu 2: Khi bạn đã biết rõ tên file cần sửa (Rẻ nhất — Tốn < 2k token)
```text
Chỉ đọc file [đường dẫn file, vd: src/main/java/com/ketoan/resource/InvDocResource.java].
Sửa hàm [tên hàm] để: [yêu cầu của bạn].
```

### Mẫu 3: Thêm danh mục mới (Chuẩn hóa theo `MasterResource`)
```text
Đọc .ai/PROJECT_GUIDE.md. Tạo danh mục mới [Tên danh mục] kế thừa MasterEntity + MasterResource (tạo migration V00019__*.sql và khai báo trong core/masterdata.js + plugins/catalog/index.jsx).
```

### Mẫu 4: Khi quay lại sau thời gian dài và muốn kiểm tra tiến độ
```text
Chỉ đọc PROJECT_STATUS.md và chạy git status / git log -n 5 --oneline để tóm tắt tiến độ hiện tại. Không đọc các file khác.
```

---

## 3. Các lệnh Slash Command hữu ích trên khung Chat

Khi đang làm việc, hãy tận dụng các lệnh có sẵn của trình chat:

| Lệnh | Khi nào nên gõ? | Tác dụng tiết kiệm Token / Thời gian |
| :--- | :--- | :--- |
| **`/compact`** | Khi cuộc trò chuyện đã kéo dài (> 10–15 lượt hỏi đáp) mà vẫn đang làm cùng 1 việc. | Nén và tóm tắt lịch sử chat cũ để giải phóng bộ nhớ ngữ cảnh (Context Window), giúp các lượt trả lời tiếp theo không bị cộng dồn token lịch sử. |
| **`/plan`** | Khi cần làm 1 tính năng phức tạp đụng cả DB + Backend + Frontend. | AI lập kế hoạch ngắn gọn từng bước để bạn duyệt trước khi sửa code, tránh sửa sai phải làm lại nhiều lần (tốn gấp đôi token). |
| **`/learn`** | Khi bạn vừa chỉ cho AI một quy tắc/cách cấu hình đặc thù và muốn nó nhớ cho lần sau. | Lưu lại quy tắc để các phiên sau không phải giải thích lại. |
| **Tạo Chat Mới (`+`)** | Ngay khi **xong 1 task** và chuẩn bị chuyển sang phân hệ khác (vd: xong *Kho*, chuyển sang *Tiền mặt*). | Xóa sạch 100% ngữ cảnh của task cũ, đưa mức tiêu thụ token mỗi câu hỏi về lại mức thấp nhất. |

---

## 4. Quy tắc giữ Repo luôn "Sạch Token"

1. **Chỉ có 2 file tài liệu chính cần duy trì:**
   - [`.ai/PROJECT_GUIDE.md`](./.ai/PROJECT_GUIDE.md) (~65 dòng): Bản đồ định vị file nhanh cho AI.
   - [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) (~80 dòng): Theo dõi việc đã xong / chưa xong cho bạn.
2. **Không tạo file `copy.jsx`, `backup.js` trong `src/`:** Nếu muốn lưu nháp, hãy dùng `git stash` hoặc tạo branch Git mới. File thừa trong `src/` sẽ làm lệnh tìm kiếm của AI đọc nhầm.
3. **Khi 1 file `plugins/<module>/index.jsx` vượt quá 700 dòng:** Nên tách phần in ấn (`print.js` / `voucher.js`) hoặc từ điển đa ngôn ngữ (`messages.js`) ra file riêng cùng thư mục để mỗi lần sửa giao diện AI chỉ cần đọc phần code gọn nhẹ.
4. **Sau khi hoàn thành 1 mốc lớn:** Nhắc AI *"Cập nhật ngắn gọn vào `PROJECT_STATUS.md`"* rồi `git commit` lại để lần sau mở lên là nắm được ngay.

