import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

// Giả định backend chạy cùng host hoặc dùng biến môi trường
const WS_URL = import.meta.env.VITE_WS_URL || (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('http', 'ws') : 'ws://localhost:8000');

export function useWebSocket(onMessage) {
  const { user } = useAuth();
  const ws = useRef(null);

  useEffect(() => {
    if (!user) {
      if (ws.current) {
        ws.current.close();
      }
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    // Kết nối WebSocket
    const connect = () => {
      const socket = new WebSocket(`${WS_URL}/ws/thongbao/${token}`);
      
      socket.onopen = () => {
        console.log('WebSocket connected');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessage) {
            onMessage(data);
          }
        } catch (err) {
          console.error('Error parsing WS message', err);
        }
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected. Reconnecting in 3s...');
        setTimeout(connect, 3000);
      };

      socket.onerror = (err) => {
        console.error('WebSocket error', err);
        socket.close();
      };

      ws.current = socket;
    };

    connect();

    return () => {
      if (ws.current) {
        // Prevent reconnect logic on unmount by removing onclose
        ws.current.onclose = null;
        ws.current.close();
      }
    };
  }, [user, onMessage]);

  return ws.current;
}
