import axios from 'axios';

// Thiết lập Interceptor toàn cục cho axios
axios.interceptors.request.use(
  (config) => {
    // Tự động chuyển đổi http://localhost:8000 thành API URL deploy nếu có cấu hình
    let deployApiUrl = import.meta.env.VITE_API_URL;
    if (deployApiUrl && config.url) {
      // Làm sạch deployApiUrl (loại bỏ khoảng trắng, dấu gạch chéo thừa ở cuối)
      deployApiUrl = deployApiUrl.trim().replace(/\/+$/, "");
      
      if (config.url.startsWith('http://localhost:8000')) {
        config.url = config.url.replace('http://localhost:8000', deployApiUrl);
      } else if (!config.url.startsWith('http') && !config.url.startsWith('/static')) {
        // Hỗ trợ request tương đối
        config.url = `${deployApiUrl}${config.url.startsWith('/') ? '' : '/'}${config.url}`;
      }
      
      // Sửa lỗi tự động nếu URL vô tình bị lặp lại nhiều lần tên miền deploy
      if (config.url.includes(deployApiUrl + deployApiUrl)) {
        config.url = config.url.replace(deployApiUrl + deployApiUrl, deployApiUrl);
      }
    }

    // Lấy token từ localStorage (nếu có)
    const token = localStorage.getItem('token');
    if (token) {
      // Đính kèm token vào header Authorization của mỗi request
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Nếu lỗi 401 (Hết hạn token hoặc không hợp lệ)
    if (error.response && error.response.status === 401) {
      // Bỏ qua nếu là request đăng nhập (để trang Login tự hiển thị thông báo lỗi)
      const isLoginRequest = error.config && error.config.url && 
        (error.config.url.includes('/api/auth/login') || error.config.url.includes('/login'));
      
      if (!isLoginRequest) {
        console.error('Token expired or invalid. Please login again.');
        // Xóa token và user, chuyển hướng về trang đăng nhập
        localStorage.removeItem('token');
        localStorage.removeItem('user:v1');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axios;
