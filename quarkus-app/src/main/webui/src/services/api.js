// const BASE_URL = 'http://localhost:8080/api'; // Đường dẫn Backend Quarkus/Spring Boot

const DUMMY_USERS = [
  { username: 'admin', password: '123', name: 'Anh Vinh', email: 'vinh@company.com' },
  { username: 'user', password: '123', name: 'Nguyễn Văn A', email: 'nva@company.com' }
];

// ===== DỮ LIỆU MOCK (DUMMY DATA) =====
const DUMMY_DATA = {
  // 1. Danh sách Folder theo Module
  folders: {
    mail: [
      { key: 'inbox', label: 'Hộp thư đến', count: 12, icon: 'Inbox' },
      { key: 'sent', label: 'Thư đã gửi', count: 0, icon: 'Send' },
      { key: 'drafts', label: 'Thư nháp', count: 2, icon: 'Edit' },
      { key: 'trash', label: 'Thùng rác', count: 5, icon: 'Delete' }
    ],
    calendar: [
      { key: 'my_calendar', label: 'Lịch cá nhân', count: 0, icon: 'Calendar' },
      { key: 'company_events', label: 'Sự kiện công ty', count: 3, icon: 'Group' }
    ],
    people: [
      { key: 'all_contacts', label: 'Tất cả danh bạ', count: 48, icon: 'Contact' },
      { key: 'favorites', label: 'Yêu thích', count: 6, icon: 'FavoriteStar' }
    ],
    todo: [
      { key: 'my_day', label: 'Ngày của tôi', count: 4, icon: 'Sun' },
      { key: 'important', label: 'Quan trọng', count: 1, icon: 'Important' },
      { key: 'tasks', label: 'Tác vụ', count: 8, icon: 'CheckMark' }
    ]
  },

  // 2. Danh sách Items theo Folder
  items: {
    inbox: [
      { id: 101, title: 'Báo cáo doanh thu Q3', subtitle: 'Phòng Kế toán', time: '10:30 AM' },
      { id: 102, title: 'Cập nhật tiến độ dự án Nail360', subtitle: 'Dev Team', time: 'Hôm qua' },
      { id: 103, title: 'Lịch bảo trì Server AWS', subtitle: 'DevOps / SysAdmin', time: '20/09' }
    ],
    sent: [
      { id: 104, title: 'Re: Lịch bảo trì Server AWS', subtitle: 'Anh Vinh', time: '11:15 AM' }
    ],
    my_calendar: [
      { id: 201, title: 'Họp Review Sprint 12', subtitle: 'Phòng họp A - AWS Project', time: '02:00 PM' },
      { id: 202, title: 'Thảo luận kiến trúc Microservices', subtitle: 'Online - Google Meet', time: '04:30 PM' }
    ],
    all_contacts: [
      { id: 301, title: 'Nguyễn Văn A', subtitle: 'Lead Backend Developer', time: 'Active' },
      { id: 302, title: 'Trần Thị B', subtitle: 'UI/UX Designer', time: 'Away' }
    ],
    my_day: [
      { id: 401, title: 'Review Code PR #104 trên GitHub', subtitle: 'Ưu tiên cao', time: 'Hôm nay' },
      { id: 402, title: 'Kiểm tra cấu hình AWS ECS Cluster', subtitle: 'DevOps', time: 'Hôm nay' }
    ]
  },

  // 3. Chi tiết Item theo ID
  details: {
    101: {
      id: 101,
      title: 'Báo cáo doanh thu Q3',
      subtitle: 'ketoan@company.com',
      time: '10:30 AM, 23/09/2026',
      body: 'Gửi Anh Vinh, Báo cáo chi tiết doanh thu quý 3 đã được cập nhật đầy đủ trong hệ thống. Nhờ anh review và duyệt giúp em trước 5h chiều nay.'
    },
    102: {
      id: 102,
      title: 'Cập nhật tiến độ dự án Nail360',
      subtitle: 'dev-team@company.com',
      time: '04:15 PM, 22/09/2026',
      body: 'Chào anh Vinh, Module quản lý kho và báo giá đã hoàn tất kết nối REST API với backend Quarkus. Đội dev đang tiến hành test tích hợp giao diện Fluent UI.'
    },
    103: {
      id: 103,
      title: 'Lịch bảo trì Server AWS',
      subtitle: 'sysadmin@company.com',
      time: '09:00 AM, 20/09/2026',
      body: 'Thông báo: Hệ thống server AWS RDS & ECS sẽ tiến hành nâng cấp bản vá bảo mật vào cuối tuần này từ 01:00 AM đến 03:00 AM.'
    },
    104: {
      id: 104,
      title: 'Re: Lịch bảo trì Server AWS',
      subtitle: 'vinh@company.com',
      time: '11:15 AM, 20/09/2026',
      body: 'Đã nhận thông tin. Nhớ backup snapshot cơ sở dữ liệu đầy đủ trước khi thực hiện nâng cấp.'
    },
    201: {
      id: 201,
      title: 'Họp Review Sprint 12',
      subtitle: 'Phòng họp A',
      time: '02:00 PM - 03:00 PM',
      body: 'Nội dung họp: Đánh giá các tính năng đã hoàn thành trong Sprint 12 và chốt backlog cho Sprint 13.'
    },
    202: {
      id: 202,
      title: 'Thảo luận kiến trúc Microservices',
      subtitle: 'Google Meet',
      time: '04:30 PM - 05:30 PM',
      body: 'Chủ đề: Tách nhỏ dịch vụ monolith sang các module Quarkus độc lập.'
    },
    301: {
      id: 301,
      title: 'Nguyễn Văn A',
      subtitle: 'nva@company.com',
      time: 'Phòng Kỹ thuật',
      body: 'Chức vụ: Lead Backend Developer. Chuyên môn: Java Spring Boot, Quarkus, Postgres, AWS.'
    },
    302: {
      id: 302,
      title: 'Trần Thị B',
      subtitle: 'ttb@company.com',
      time: 'Phòng Thiết kế',
      body: 'Chức vụ: UI/UX Designer. Chuyên môn: Figma, Fluent UI, React Styling.'
    },
    401: {
      id: 401,
      title: 'Review Code PR #104 trên GitHub',
      subtitle: 'Công việc cá nhân',
      time: 'Hạn chót: 18:00',
      body: 'Kiểm tra phần tối ưu hóa câu lệnh T-SQL và các component React mới tách.'
    },
    402: {
      id: 402,
      title: 'Kiểm tra cấu hình AWS ECS Cluster',
      subtitle: 'DevOps',
      time: 'Hạn chót: 20:00',
      body: 'Xác minh lại auto-scaling policy và SSL certificate cho domain dịch vụ.'
    }
  }
};

// Hàm giả lập độ trễ mạng (Network Delay) giúp trải nghiệm UI giống như đang gọi Server thật
const mockDelay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

// ===== SERVICE API =====
export const apiService = {
  // 1. Lấy cây thư mục theo Module (mail, calendar, people, todo)
  getFoldersByModule: async (moduleName) => {
    /* 
    // --- LỜI GỌI API THỰC TẾ ---
    const res = await fetch(`${BASE_URL}/folders?module=${moduleName}`);
    if (!res.ok) throw new Error('Failed to fetch folders');
    return res.json();
    */

    // --- DUMMY DATA ---
    await mockDelay(200);
    return DUMMY_DATA.folders[moduleName] || [];
  },

  // 2. Lấy danh sách item theo Folder
  getItemsByFolder: async (folderKey) => {
    /* 
    // --- LỜI GỌI API THỰC TẾ ---
    const res = await fetch(`${BASE_URL}/items?folder=${folderKey}`);
    if (!res.ok) throw new Error('Failed to fetch items');
    return res.json();
    */

    // --- DUMMY DATA ---
    await mockDelay(300);
    return DUMMY_DATA.items[folderKey] || [];
  },

  // 3. Lấy chi tiết 1 item theo ID
  getItemDetailById: async (itemId) => {
    /* 
    // --- LỜI GỌI API THỰC TẾ ---
    const res = await fetch(`${BASE_URL}/items/${itemId}`);
    if (!res.ok) throw new Error('Failed to fetch item detail');
    return res.json();
    */

    // --- DUMMY DATA ---
    await mockDelay(250);
    return DUMMY_DATA.details[itemId] || null;
  },

  // 4. Xóa một item
  deleteItem: async (itemId) => {
    /* 
    // --- LỜI GỌI API THỰC TẾ ---
    const res = await fetch(`${BASE_URL}/items/${itemId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete item');
    return res.json();
    */

    // --- DUMMY DATA ---
    await mockDelay(200);
    console.log(`[Mock API] Deleted item ID: ${itemId}`);
    return { success: true, message: `Item ${itemId} deleted successfully` };
  },
  
  // 5. Đăng nhập
  login: async (username, password) => {
    /*
    // --- LỜI GỌI API THỰC TẾ ---
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error('Invalid credentials');
    return res.json();
    */

    // --- DUMMY DATA ---
    await mockDelay(400);
    const user = DUMMY_USERS.find(
      u => u.username === username && u.password === password
    );

    if (!user) {
      throw new Error('Tài khoản hoặc mật khẩu không chính xác!');
    }

    const token = `mock-jwt-token-${user.username}-${Date.now()}`;
    return {
      token,
      user: { name: user.name, email: user.email, username: user.username }
    };
  }
};