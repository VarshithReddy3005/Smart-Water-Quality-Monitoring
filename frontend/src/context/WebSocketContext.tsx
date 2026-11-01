import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { SensorReading, Alert } from '../types';

interface WebSocketContextType {
  isConnected: boolean;
  latestReading: SensorReading | null;
  recentAlerts: Alert[];
  unreadAlertCount: number;
  clearAlertCount: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [latestReading, setLatestReading] = useState<SensorReading | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/live`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isMounted) setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'NEW_READING') {
            if (isMounted) setLatestReading(payload.data);
          } else if (payload.type === 'NEW_ALERT') {
            if (isMounted) {
              setRecentAlerts(prev => [payload.data, ...prev.slice(0, 19)]);
              setUnreadAlertCount(c => c + 1);
            }
          }
        } catch (err) {
          console.error("WS message parse error:", err);
        }
      };

      ws.onclose = () => {
        if (isMounted) {
          setIsConnected(false);
          // Attempt reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    // Ping interval to keep connection alive through proxies
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send("ping");
      }
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const clearAlertCount = () => setUnreadAlertCount(0);

  return (
    <WebSocketContext.Provider value={{ isConnected, latestReading, recentAlerts, unreadAlertCount, clearAlertCount }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error('useWebSocket must be used within a WebSocketProvider');
  return context;
};
