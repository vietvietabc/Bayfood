import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

// Giả định backend chạy cùng host hoặc dùng biến môi trường
let WS_URL = import.meta.env.VITE_WS_URL;
if (!WS_URL) {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  WS_URL = apiUrl.replace('https://', 'wss://').replace('http://', 'ws://');
}

export function useWebSocket(onMessage) {
  const { user } = useAuth();
  const ws = useRef(null);
  const onMessageRef = useRef(onMessage);
  const retryCount = useRef(0);
  const MAX_RETRIES = 5;

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!user) {
      if (ws.current) {
        ws.current.close();
      }
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    let isUnmounted = false;

    const connect = () => {
      if (isUnmounted || retryCount.current >= MAX_RETRIES) return;

      const socket = new WebSocket(`${WS_URL}/ws/thongbao/${token}`);
      ws.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connected');
        retryCount.current = 0;
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessageRef.current) {
            onMessageRef.current(data);
          }
        } catch (err) {
          console.error('Error parsing WS message', err);
        }
      };

      socket.onclose = () => {
        if (!isUnmounted) {
          retryCount.current += 1;
          console.log(`WebSocket disconnected. Retry ${retryCount.current}/${MAX_RETRIES}`);
          if (retryCount.current < MAX_RETRIES) {
            setTimeout(connect, 3000);
          }
        }
      };

      socket.onerror = (err) => {
        console.error('WebSocket error', err);
        socket.close();
      };
    };

    connect();

    return () => {
      isUnmounted = true;
      if (ws.current) {
        ws.current.onclose = null;
        ws.current.close();
      }
    };
  }, [user]);

  return ws.current;
}
