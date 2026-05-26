# HƯỚNG DẪN QUẢN LÝ TÀI KHOẢN & CẤP QUYỀN NHÂN VIÊN

Tài liệu này hướng dẫn cách cấp quyền hạn, quản lý vai trò (Roles), quản lý quyền tính năng (Permissions) và đặt lại mật khẩu cho nhân viên trong hệ thống **BawuiWeb**.

---

## 1. Các cấp độ vai trò (Roles) trong hệ thống

Hệ thống được thiết kế với 5 nhóm vai trò mặc định:

| Tên vai trò | Mã hệ thống | Mô tả quyền hạn mặc định |
| :--- | :--- | :--- |
| **Quản trị viên tối cao** | `SUPER_ADMIN` | Có toàn quyền trên toàn hệ thống (bao gồm quản lý tài khoản/phân quyền). |
| **Trưởng phòng Nhân sự** | `HR_MANAGER` | Quản lý thông tin nhân viên, hợp đồng, bảng lương, duyệt nghỉ phép, v.v. |
| **Quản lý bộ phận** | `DEPARTMENT_MANAGER` | Quản lý ca làm việc (shifts) và phê duyệt yêu cầu của nhân viên thuộc bộ phận mình. |
| **Nhân viên thông thường** | `EMPLOYEE` | Xem lịch làm việc cá nhân, xin nghỉ phép, xin tăng ca, nhận thông báo. |
| **Chỉ xem dữ liệu** | `VIEWER` | Tài khoản chỉ có quyền đọc dữ liệu, không được phép chỉnh sửa hoặc phê duyệt. |

---

## 2. Cách cấp quyền (Thay đổi Vai trò) cho Nhân viên

Chỉ tài khoản **Quản trị viên tối cao (`SUPER_ADMIN`)** mới có quyền thực hiện các thao tác này.

### Các bước thực hiện:
1. Đăng nhập vào hệ thống bằng tài khoản quản trị (`SUPER_ADMIN`).
2. Truy cập vào trang quản lý phân quyền theo đường dẫn: `/roles` (hoặc click vào nút quản lý tài khoản trên thanh menu).
3. Tại tab **アカウント一覧 (Danh sách tài khoản)**:
   - Sử dụng ô tìm kiếm 🔍 để tìm nhân viên cần phân quyền (tìm bằng Tên, Mã nhân viên, Email hoặc Phòng ban).
   - Tại cột **権限 (Vai trò/Role)** của nhân viên đó, chọn vai trò mới từ danh sách thả xuống (Dropdown).
4. Nhấn nút **保存 (Lưu)** ở cuối dòng để áp dụng thay đổi.

---

## 3. Cách điều chỉnh chi tiết quyền tính năng (Permissions Matrix)

Nếu bạn muốn thay đổi xem một Vai trò (ví dụ: *Quản lý bộ phận*) có được làm một hành động nào đó hay không (ví dụ: *chỉnh sửa lịch làm việc*), bạn có thể cấu hình động thông qua ma trận quyền hạn:

### Các bước thực hiện:
1. Truy cập trang `/roles` bằng tài khoản `SUPER_ADMIN`.
2. Chuyển sang tab **権限機能マトリクス (Ma trận tính năng & quyền hạn)**.
3. Bạn sẽ nhìn thấy một bảng gồm:
   - Các dòng: Các chức năng chi tiết trong hệ thống (Ví dụ: `employees:edit` - sửa nhân viên, `attendance:edit` - sửa lịch làm việc/chấm công).
   - Các cột: 5 nhóm vai trò (`SUPER_ADMIN`, `HR_MANAGER`, v.v.).
4. **Tích chọn hoặc Bỏ tích** vào ô tương ứng để cấp hoặc thu hồi quyền của nhóm vai trò đó.
5. Sau khi chỉnh sửa xong, nhấn nút **マトリクスを保存 (Lưu ma trận)** ở góc trên bên phải để áp dụng trên toàn hệ thống ngay lập tức.

---

## 4. Hướng dẫn Đặt lại Mật khẩu (Reset Password) cho Nhân viên

Khi nhân viên quên mật khẩu hoặc cần cấp mật khẩu mặc định ban đầu:

### Các bước thực hiện:
1. Truy cập trang `/roles` bằng tài khoản `SUPER_ADMIN`.
2. Tại danh sách tài khoản, tìm đến nhân viên cần reset mật khẩu.
3. Nhấp vào nút **初期値 (Mặc định)** ở cột mật khẩu của nhân viên đó.
4. Hệ thống sẽ tự động tạo mật khẩu mặc định theo công thức:
   $$\text{Mật khẩu mặc định} = \text{[Mã nhân viên]} + \text{[Ngày tháng năm sinh dạng YYYYMMDD (không gạch ngang)]}$$
   *Ví dụ: Nhân viên có mã `EMP012` và ngày sinh là `15/05/1998` thì mật khẩu mặc định sẽ là `EMP01219980515`.*
5. Nhấn nút **保存 (Lưu)** ở cuối dòng để xác nhận mật khẩu mới. Báo cho nhân viên mật khẩu này để họ đăng nhập và đổi lại sau đó.

---

## 5. Hướng dẫn Phân bổ Quản lý theo từng Bộ phận (Department Management)

Để cấu hình cho một nhân viên làm **Quản lý** chịu trách nhiệm trực tiếp cho một bộ phận/phòng ban cụ thể (ví dụ: Trưởng phòng Tiếng Nhật, Quản lý bộ phận IT):

### Các bước cấu hình:
1. **Bước 1: Thiết lập Phòng ban cho Quản lý:**
   - Truy cập trang **社員一覧 (Danh sách nhân viên)** tại `/employees`.
   - Tìm kiếm nhân viên muốn bổ nhiệm làm quản lý và bấm nút **編集 (Chỉnh sửa)**.
   - Tại mục **部署 (Phòng ban/Department)**, chọn phòng ban mà người đó sẽ quản lý (ví dụ: *Sales* hoặc *IT*).
   - Nhấn **保存 (Lưu)**.
2. **Bước 2: Nâng cấp vai trò thành Quản lý Bộ phận:**
   - Truy cập trang phân quyền `/roles`.
   - Tại cột **権限 (Vai trò)** của nhân viên đó, chọn **Quản lý bộ phận (DEPARTMENT_MANAGER)**.
   - Nhấn **保存 (Lưu)** ở cuối dòng để xác nhận.

### Cách thức hoạt động của quyền hạn này:
- Khi một nhân viên có vai trò là `DEPARTMENT_MANAGER` và thuộc phòng ban *Sales*, hệ thống sẽ tự động đối chiếu mã phòng ban (`departmentId`).
- Người quản lý này sẽ chỉ nhìn thấy, chỉnh sửa ca làm việc (Shifts) và phê duyệt các yêu cầu (xin nghỉ phép, xin tăng ca) của các nhân viên có cùng phòng ban *Sales*. Họ sẽ không thể can thiệp vào phòng ban khác (ví dụ: *IT* hay *HR*), đảm bảo tính bảo mật và phân quyền rõ ràng.

