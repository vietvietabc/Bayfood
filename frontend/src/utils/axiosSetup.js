import axios from 'axios';

// Thiết lập Interceptor toàn cục cho axios
axios.interceptors.request.use(
  (config) => {
    // Tự động chuyển đổi sang API URL deploy hoặc mặc định là localhost nếu chạy local
    let deployApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
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
      // Bỏ qua nếu là request đăng nhập hoặc lấy thông tin user
      // (để trang Login tự hiển thị thông báo lỗi)
      const skipUrls = ['/api/auth/login', '/api/auth/me', '/api/auth/register'];
      const isAuthRequest = error.config && error.config.url &&
        skipUrls.some(u => error.config.url.includes(u));
      
      if (!isAuthRequest) {
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
