# 🎬 Cozy Cinema Live (Rạp Chiếu Phim & Nhạc Chill Ảo 2.5D)

> **Mã nguồn mở tương tác thời gian thực cho TikTok Live Stream & OBS Studio chuẩn khung hình dọc 9:16.**  
> Khán giả xem livestream bình luận để nhận ghế ngồi trong rạp, đổi diện mạo (skin), gọi bắp rang bơ, thả tim cổ vũ và tặng quà để được AI xướng tên.

---

## ✨ Tính Năng Nổi Bật

* **Khung hình chuẩn dọc 9:16 (1080x1920):** Thiết kế tối ưu cho TikTok Live Studio và OBS Studio Browser Source.
* **Mô phỏng Rạp Chiếu 2.5D (Isometric Perspective):** 
  * 36 ghế ngồi chia làm 4 hàng (A, B, C, D) với chiều sâu phối cảnh.
  * Tự động xếp chỗ ngẫu nhiên hoặc thay thế ghế cũ khi rạp kín chỗ.
* **Tương tác Thời Gian Thực từ TikTok:**
  * 💬 **Bình luận:** Nhận ngay 1 ghế ngồi trong rạp.
  * 🐱 **Đổi diện mạo:** Gõ `nam`, `nu`, `meo`, `hoodie`, `kinh` để đổi skin avatar.
  * 🍿 **Gọi đồ ăn vặt:** Gõ `!bap`, `!nuoc`, `!bia` để xuất hiện hộp bắp rang bơ, ly trà sữa trên tay.
  * ❤️ **Thả tim (Táp màn hình):** Kích hoạt hiệu ứng tim bay bổng trên đầu nhân vật và tiếng vỗ tay.
  * 👑 **Tặng quà (Gifts):** Nâng cấp lên ghế VIP viền vàng, phát chuông rạp và **giọng AI (TTS)** xướng danh tri ân người tặng.
* **Bộ Giả Lập Tương Tác (Simulator):** Cho phép test toàn bộ tính năng offline mượt mà ngay cả khi chưa phát trực tiếp!

---

## 🚀 Hướng Dẫn Sử Dụng Nhanh

### Cách 1: Xem Thử Nghiệm Ngay (Không Cần Cài Node.js)
Bạn chỉ cần nhấp đúp chuột để mở tệp:
👉 **`public/standalone.html`** bằng trình duyệt (Google Chrome, Cốc Cốc hoặc Microsoft Edge).
* Cột trái: Màn hình rạp chiếu phim 9:16 sống động.
* Cột phải: Bảng nút bấm giả lập (Thêm người, đổi skin, order bắp nước, tặng quà VIP).

---

### Cách 2: Chạy Máy Chủ Kết Nối TikTok Live Thật (Yêu cầu Node.js v18+)

1. **Cài đặt thư viện:**
   ```bash
   cd cozy-cinema-live
   npm install
   ```

2. **Khởi chạy máy chủ:**
   ```bash
   npm start
   ```

3. **Truy cập giao diện:**
   * **Bảng điều khiển Streamer (Admin):** `http://localhost:3000/control.html`
   * **Màn hình Overlay đưa vào OBS:** `http://localhost:3000/overlay.html`

4. **Đưa vào OBS Studio:**
   * Thêm nguồn **Browser Source** (Trình duyệt).
   * URL: `http://localhost:3000/overlay.html`
   * Chiều rộng (Width): `1080`
   * Chiều cao (Height): `1920`
   * Tích chọn: *Control audio via OBS* (Điều khiển âm thanh qua OBS).

---

## ⌨️ Bảng Lệnh Cho Khán Giả Trên TikTok Live

| Bình luận của người xem | Hiệu ứng trên màn hình rạp chiếu |
| :--- | :--- |
| *Bình luận bất kỳ* | Nhận 1 vé và ngồi vào ghế trống trong rạp |
| `nam`, `nu`, `nữ` | Đổi diện mạo thành Nam / Nữ nơ hồng |
| `meo`, `mèo` | Đổi diện mạo thành chú Mèo dễ thương 🐱 |
| `hoodie`, `kinh` | Đổi phong cách Áo Hoodie ngầu hoặc Đeo Kính |
| `!bap`, `bắp`, `popcorn` | Xuất hiện hộp Bắp Rang Bơ trên tay 🍿 |
| `!nuoc`, `!tra`, `coca` | Xuất hiện ly Nước Ngọt / Trà Sữa 🥤 |
| `!bia`, `beer` | Xuất hiện lon Bia mát lạnh 🍺 |
| *Thả tim vào màn hình* | Hiệu ứng tim bay bổng trên đỉnh đầu |
| *Tặng quà (Hoa hồng, Mũ, Quà khủng...)* | Nâng cấp ghế VIP phát sáng, xướng tên trên màn hình & phát loa AI |

---

## 🛠️ Cấu Trúc Dự Án

```text
cozy-cinema-live/
├── public/
│   ├── css/
│   │   └── cinema.css         # Giao diện rạp chiếu, đèn neon và hiệu ứng
│   ├── js/
│   │   └── cinema-engine.js   # 2.5D Canvas Engine, Web Audio Synthesizer
│   ├── overlay.html           # Màn hình chính OBS Browser Source (9:16)
│   ├── control.html           # Bảng điều khiển Streamer & TikTok connector
│   └── standalone.html        # Bản chạy thử offline không cần Node.js
├── server.js                  # Express + WebSocket + TikTok Connector + Edge TTS
├── package.json
└── README.md
```

---

## 📜 Giấy Phép (License)
Dự án được phân phối dưới giấy phép **MIT License**. Tự do sử dụng, chỉnh sửa và phát triển cho các buổi phát sóng của bạn!
