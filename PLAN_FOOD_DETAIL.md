# Kế Hoạch Thêm Tính Năng "Chi Tiết Món Ăn & Đánh Giá"

## 1. Mục Tiêu
Khi người dùng (khách hàng) click vào một món ăn trên trang Thực Đơn, một màn hình (Modal/Popup) sẽ hiện lên hiển thị:
- Hình ảnh lớn, rõ nét của món ăn.
- Tên món, mô tả chi tiết, và giá tiền.
- Nút thêm vào giỏ hàng.
- **Danh sách đánh giá của khách hàng** đã từng thưởng thức món này.

## 2. Phân Tích Hiện Trạng
- **Frontend**: Đã có `FoodCard.jsx` và `MenuPage.jsx`. Ta cần thêm một component Modal (VD: `FoodDetailModal.jsx`).
- **Backend / Database**:
  - Bảng `DANHGIA` hiện tại được gắn với `DONHANG` (`id_donHang`), không gắn trực tiếp với `MONAN`.
  - **Cách giải quyết**: Để lấy được đánh giá của một món ăn cụ thể, chúng ta sẽ truy vấn các đánh giá (`DanhGia`) thuộc về những đơn hàng (`DonHang`) có chứa món ăn đó (thông qua `ChiTietDonHang`).

## 3. Các Bước Triển Khai (Chi tiết)

### Bước 1: Cập nhật Backend (API lấy đánh giá theo món)
- **Sửa file**: `backend/app/api/thucdon.py`
- **Công việc**: Thêm một API endpoint `GET /api/thucdon/{id_monAn}/danhgia`
- **Logic**: Join bảng `DanhGia`, `ChiTietDonHang`, và `NguoiDung`. Trả về danh sách gồm: Tên người dùng, số sao, nội dung đánh giá, và thời gian (nếu có).

### Bước 2: Tạo Component Frontend `FoodDetailModal.jsx`
- **Tạo file**: `frontend/src/components/FoodDetailModal.jsx`
- **Giao diện**:
  - Nửa trên / bên trái: Hình ảnh, tên, giá, nút Add to Cart.
  - Nửa dưới / bên phải: Khu vực "Đánh giá từ khách hàng". Sử dụng Skeleton loading khi đang gọi API.
  - UI được thiết kế đẹp, viền bo tròn, shadow, nút Close (X) ở góc trên.

### Bước 3: Tích hợp vào Giao Diện Hiện Tại
- **Cập nhật `FoodCard.jsx`**:
  - Biến hình ảnh món ăn thành dạng clickable (hiện con trỏ chuột dạng pointer).
  - Hoặc thêm dòng chữ / icon "Xem chi tiết" để mở Modal.
- **Cập nhật `MenuPage.jsx`**:
  - Thêm state: `const [selectedFood, setSelectedFood] = useState(null);`
  - Render component `FoodDetailModal` khi `selectedFood != null`.

## 4. Bạn (Người dùng) có đồng ý không?
Nếu bạn thấy kế hoạch này hợp lý:
1. Đánh giá xem bạn có muốn thêm bảng riêng cho Đánh giá từng món, hay cứ dùng cách Join Đơn Hàng như trên (Join là cách tốt nhất để không phải sửa Database lúc này).
2. Trả lời "Đồng ý" hoặc "Apply" để tôi bắt đầu code và thay đổi các file trên nhé!
