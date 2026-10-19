# Nâng Cấp Đồ Họa Tốc Độ Cao & Giao Diện HUD Chiến Thuật — TripleD Open Cup

Bản kế hoạch này tập trung nâng tầm cảm giác lái tốc độ cao và khả năng quan sát chiến thuật trong chặng đua thông qua 4 gói nâng cấp Đồ Họa (VFX) và Giao Diện (HUD) mà bạn đã lựa chọn.

## User Review & Critical Decisions

> [!IMPORTANT]
> Dưới đây là các hạng mục nâng cấp đã được chốt dựa trên lựa chọn của bạn, kết hợp cùng tinh chỉnh cảm giác lái mượt mà ở tốc độ 60 FPS:

- **Quyết Định Đồ Họa 1 (Đã xác nhận)**: **Hiệu Ứng Vệt Gió Speed Lines, Zoom Động & Rung Camera Khi Bật Nitro** — Khi kích hoạt Nitro (giữ phím `Shift`, ăn bình Nitro, đề-pa Rocket Start hoặc đi qua dải Boost), viền màn hình xuất hiện các tia gió xé không khí hướng tâm, kết hợp camera lùi nhẹ mở rộng tầm nhìn và độ rung động cơ chân thực.
- **Quyết Định Đồ Họa 2 (Đã xác nhận)**: **Thời Tiết Động Đặc Trưng Theo 5 Bản Đồ & Chùm Sáng Đèn Pha Xe** — Mỗi bản đồ sở hữu hiệu ứng môi trường thời gian thực riêng biệt (Mưa Neon tại Thành Phố, Tuyết Rơi tại Phòng Thí Nghiệm Băng, Đom Đóm Sinh Học tại Đầm Lầy, Hạt Năng Lượng tại Thung Lũng ADN, Tàn Lửa Huyết Mạch tại Đại Động Mạch) cùng 2 luồng đèn pha chiếu sáng mặt đường phía trước mũi xe.
- **Quyết Định Giao Diện 1 (Đã xác nhận)**: **Hệ Thống Cảnh Báo Tên Lửa Bám Đuổi & Mũi Tên Đối Thủ Áp Sát** — Hiển thị tâm khóa mục tiêu nhấp nháy kèm khoảng cách mét khi có Tên Lửa Tự Hành đang lao tới từ phía sau, đồng thời hiển thị các mũi tên chỉ hướng đối thủ đang áp sát ở cự ly gần.
- **Quyết Định Giao Diện 2 (Đã xác nhận)**: **Bảng Thông Báo Sự Kiện Trực Tiếp (Killfeed) & Băng Rôn Vòng Đua Cuối (Final Lap)** — Hiển thị thông báo thời gian thực khi có pha bắn trúng tên lửa, trượt vỏ chuối, soán ngôi Top 1 và hiệu ứng chữ lớn báo hiệu khi bước vào Vòng Đua Cuối.

---

## 1. Overview & Core Concept

- **Trải Nghiệm Mang Lại**: Biến mỗi chặng đua thành một màn trình diễn tốc độ sống động như các tựa game đua xe Arcade hiện đại (Asphalt / ZingSpeed), nơi người chơi cảm nhận rõ sự khác biệt khi bật Nitro, thấy trước mối nguy hiểm từ phía sau và nắm bắt diễn biến trận đấu tức thì.
- **Đối Tượng Sử Dụng**: Học sinh và Giáo Viên tham gia các chặng đua luyện tập, phòng bạn bè và Giải Đấu Chính Thức.
- **Giá Trị Cốt Lõi**:
  - Tăng mạnh **cảm giác bứt tốc (Sense of Speed)** mà không làm giảm hiệu năng khung hình.
  - Cung cấp **thông tin chiến thuật trực quan (Tactical Awareness)** giúp người chơi chủ động đánh lái né tên lửa hoặc bảo vệ vị trí dẫn đầu ở vòng cuối.

---

## 2. User Experience & Visual Design

### A. Luồng Trải Nghiệm Trong Chặng Đua
1. **Xuất Phát & Môi Trường Bản Đồ**: Ngay khi vào đường đua, người chơi cảm nhận bầu không khí đặc trưng của từng bản đồ qua lớp hạt thời tiết chuyển động và chùm đèn pha xe rọi xuống mặt đường nhựa.
2. **Kích Hoạt Nitro & Bứt Tốc**: Khi nhấn giữ `Shift` hoặc ăn vật phẩm tăng tốc, camera hơi lùi ra để mở rộng góc nhìn, rung nhẹ theo nhịp phản lực và kích hoạt vòng tia gió trắng-xanh (Speed Lines) ở 4 góc màn hình.
3. **Cảnh Báo Nguy Hiểm Phía Sau**:
   - Khi có đối thủ tiến vào vùng 180px phía sau, các mũi tên chỉ hướng màu Vàng/Cam xuất hiện ở cạnh dưới màn hình theo đúng góc tiếp cận.
   - Khi có **Tên Lửa Tự Hành** khóa mục tiêu vào xe người chơi, biểu tượng cảnh báo đỏ kèm khoảng cách thu hẹp (`⚠️ TÊN LỬA ĐANG TỚI: 85m`) nhấp nháy giúp người chơi kịp thời cua gấp hoặc tìm vật cản.
4. **Killfeed Sự Kiện & Vòng Đua Cuối**:
   - Mọi pha bắn trúng tên lửa, đạp trúng bẫy chuối/bùn hoặc vươn lên dẫn đầu Top 1 đều xuất hiện gọn gàng trên bảng sự kiện góc trên bên phải (tự động mờ dần sau 3.5 giây).
   - Khi người chơi cán vạch bước sang vòng đua cuối cùng, băng rôn **🔥 VÒNG ĐUA CUỐI (FINAL LAP!)** bung ra ở giữa màn hình rồi thu gọn để khích lệ tinh thần nước rút.

### B. Hệ Thống Thị Giác & Bảng Màu (60-30-10)
- **60% Không Gian Đường Đua & Thời Tiết**: Giữ độ tương phản rõ nét giữa mặt đường đua và cảnh quan xung quanh; các hạt thời tiết có độ trong suốt vừa phải (`alpha 0.25 – 0.55`) để tạo chiều sâu mà không che khuất chướng ngại vật.
- **30% Bề Mặt HUD Khí Động Học**: Các bảng thông báo Killfeed và cảnh báo sử dụng nền kính tối (`#0F172A/85`) để nổi bật trên mọi nền bản đồ.
- **10% Điểm Nhấn Tín Hiệu**:
  - **Xanh Điện Quang (`#38BDF8`) & Vàng Hổ Phách (`#F59E0B`)**: Tia gió Speed Lines, thông báo vượt mặt Top 1 và băng rôn Vòng Đua Cuối.
  - **Đỏ Cảnh Báo (`#EF4444`)**: Khung báo động Tên Lửa Bám Đuổi và thông báo trúng đòn tấn công.
- **Typography & Số Liệu**: Toàn bộ khoảng cách cảnh báo tên lửa (`m`), tốc độ (`KM/H`) và thứ hạng sử dụng chữ số đơn cách (`tabular-nums`) giúp mắt đọc thông tin trong tích tắc.

---

## 3. Key Product Decisions & Trade-Offs

- **Quyết Định 1: Vẽ Speed Lines & Thời Tiết Động Trực Tiếp Trên Lớp Canvas Màn Hình (Screen-Space Overlay)**
  - *Cách tiếp cận*: Thay vì tạo hàng ngàn đối tượng trong tọa độ thế giới, hệ thống hạt thời tiết và tia gió Speed Lines được tính toán trực tiếp trong khung nhìn camera (Screen-Space) với bộ đệm cố định.
  - *Lý do*: Đảm bảo tốc độ khung hình luôn đạt chuẩn 60 FPS mượt mà ngay cả khi đua 50 xe cùng lúc.
- **Quyết Định 2: Chùm Đèn Pha Đa Tầng Có Độ Trong Suốt Mềm (Radial/Linear Gradient Cone)**
  - *Cách tiếp cận*: Mỗi chiến xa phát ra 2 nón sáng mảnh chiếu về phía trước mũi xe, tự động tăng cường độ sáng trong các bản đồ tối (Thành Phố Đêm, Thung Lũng ADN, Phòng Thí Nghiệm Băng).
  - *Lý do*: Tăng tính chân thực cho chiếc xe và giúp người chơi nhận diện hướng mũi xe của mình và đối thủ dễ dàng hơn khi ôm cua.
- **Quyết Định 3: Giới Hạn Tối Đa 4 Dòng Thông Báo Killfeed Cùng Lúc**
  - *Cách tiếp cận*: Bảng sự kiện chỉ giữ tối đa 4 thông báo mới nhất và tự động ẩn sau 3.5 giây.
  - *Lý do*: Giữ màn hình thi đấu luôn thoáng đãng, không gây rối mắt khi có nhiều pha va chạm diễn ra liên tiếp.

---

## 4. Technical Architecture & Data Strategy

### A. Sơ Đồ Kiến Trúc Luồng Xử Lý Đồ Họa & HUD Trong Trận Đua

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     VÒNG LẶP ĐUA XE 60 FPS (RACE LOOP)                  │
└───────────────────┬─────────────────────────────────┬───────────────────┘
                    │                                 │
                    ▼                                 ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────┐
│     BỘ DỰNG ĐỒ HỌA & VFX (CANVAS)     │ │   BỘ PHÂN TÍCH CHIẾN THUẬT    │
├───────────────────────────────────────┤ ├───────────────────────────────┤
│ 1. Camera Động (Zoom & Rung Nitro)    │ │ 1. Quét Tên Lửa Khóa Mục Tiêu │
│ 2. Chùm Đèn Pha Xe (Headlight Cones)  │ │    (Tính khoảng cách & góc)   │
│ 3. Thời Tiết Động 5 Bản Đồ            │ │ 2. Quét Đối Thủ Áp Sát (<180p)│
│    (Mưa / Tuyết / Đom Đóm / Tinh Thể) │ │ 3. Ghi Nhận Sự Kiện Killfeed  │
│ 4. Tia Gió Tốc Độ Cao (Speed Lines)   │ │    & Chuyển Giao Vòng Cuối    │
└───────────────────┬───────────────────┘ └───────────────┬───────────────┘
                    │                                     │
                    └──────────────────┬──────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                LỚP GIAO DIỆN CHIẾN THUẬT (TACTICAL HUD)                 │
├────────────────────────┬─────────────────────────┬──────────────────────┤
│ • Băng Rôn Vòng Cuối   │ • Cảnh Báo Tên Lửa Đỏ   │ • Bảng Killfeed      │
│   (Final Lap Banner)   │   & Mũi Tên Áp Sát      │   (Top-Right Ticker) │
└────────────────────────┴─────────────────────────┴──────────────────────┘
```

### B. Mô Hình Dữ Liệu & Tương Tác Trạng Thái
- **Trạng Thái Camera Động**:
  - Khi người chơi kích hoạt Nitro hoặc đi qua dải tăng tốc: `cam.zoom` chuyển mượt từ `1.0` về `0.90` (mở rộng khung nhìn), cộng thêm dao động vi mô (`±2.2px`) mô phỏng lực đẩy động cơ phản lực.
- **Trạng Thái Cảnh Báo Tiếp Cận (Proximity & Threat State)**:
  - Mỗi khung hình kiểm tra các quả tên lửa (`hz.type === 'rocket'`) đang hướng về người chơi trong bán kính `750px` để tính khoảng cách mét và góc tiếp cận.
  - Kiểm tra các tay đua đối thủ phía sau trong bán kính `220px` để hiển thị tối đa 3 mũi tên cảnh báo vượt mặt ở cạnh dưới màn hình.
- **Trạng Thái Bảng Sự Kiện (Killfeed Queue)**:
  - Lưu trữ danh sách sự kiện `{ id, timestamp, text, category: 'rocket' | 'trap' | 'lead' | 'lap' }`.
  - Khi một tay đua bị trúng tên lửa, trượt vỏ chuối, hoặc khi người dẫn đầu Top 1 thay đổi, hệ thống đẩy một bản ghi mới vào hàng đợi và tự động dọn dẹp các bản ghi quá 3.5 giây.
