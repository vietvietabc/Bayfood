import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

let WS_URL = import.meta.env.VITE_WS_URL;
if (!WS_URL) {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  WS_URL = apiUrl.replace('https://', 'wss://').replace('http://', 'ws://');
}

const MAX_RETRIES = 6;

export function useWebSocket(onMessage) {
  const { user } = useAuth();
  const wsRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  const retryRef = useRef(0);
  const timerRef = useRef(null);
  const unmountedRef = useRef(false);

  // Luôn giữ callback mới nhất, không re-subscribe WS
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    unmountedRef.current = false;
    retryRef.current = 0;

    if (!user) {
      // Không có user → đóng nếu đang mở
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const connect = () => {
      if (unmountedRef.current) return;
      if (retryRef.current >= MAX_RETRIES) {
        console.warn('[WS] Max retries reached, stopping.');
        return;
      }

      // Đóng kết nối cũ sạch trước khi tạo mới
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        if (wsRef.current.readyState < 2) { // CONNECTING or OPEN
          wsRef.current.close();
        }
        wsRef.current = null;
      }

      const socket = new WebSocket(`${WS_URL}/ws/thongbao/${token}`);
      wsRef.current = socket;

      socket.onopen = () => {
        if (unmountedRef.current) { socket.close(); return; }
        retryRef.current = 0;
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current?.(data);
        } catch (err) {
          console.error('[WS] Parse error:', err);
        }
      };

      socket.onerror = () => {
        // onerror luôn được theo sau bởi onclose → không cần xử lý thêm
      };

      socket.onclose = () => {
        if (unmountedRef.current) return;
        retryRef.current += 1;
        if (retryRef.current < MAX_RETRIES) {
          // Exponential backoff: 2s, 3s, 4.5s, 6.75s...
          const delay = Math.min(2000 * Math.pow(1.5, retryRef.current - 1), 20000);
          timerRef.current = setTimeout(connect, delay);
        }
      };
    };

    connect();

    return () => {
      unmountedRef.current = true;
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null; // Quan trọng: không trigger retry khi unmount
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user]);

  return wsRef.current;
}
