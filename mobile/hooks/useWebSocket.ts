/**
 * useWebSocket — WebSocket connection to API_BASE_URL/ws/{clientId}
 */
import { useEffect, useRef, useCallback, useState } from 'react';

type MessageHandler = (data: unknown) => void;
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseWebSocketOptions {
  clientId?: string;
  onMessage?: MessageHandler;
  autoReconnect?: boolean;
  reconnectIntervalMs?: number;
}

export function useWebSocket({
  clientId = 'mobile-client',
  onMessage,
  autoReconnect = true,
  reconnectIntervalMs = 5000,
}: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  const baseUrl = process.env['API_BASE_URL'] ?? 'http://localhost:3000';
  const wsUrl = baseUrl.replace(/^http/, 'ws') + `/ws/${clientId}`;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus('connecting');

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted.current) return;
        setStatus('connected');
        console.log(`[WS] Connected to ${wsUrl}`);
      };

      ws.onmessage = (event) => {
        if (!isMounted.current) return;
        try {
          const data = JSON.parse(event.data as string);
          onMessage?.(data);
        } catch {
          onMessage?.(event.data);
        }
      };

      ws.onerror = () => {
        if (!isMounted.current) return;
        setStatus('error');
      };

      ws.onclose = () => {
        if (!isMounted.current) return;
        setStatus('disconnected');
        if (autoReconnect) {
          reconnectTimer.current = setTimeout(connect, reconnectIntervalMs);
        }
      };
    } catch (err) {
      setStatus('error');
    }
  }, [wsUrl, onMessage, autoReconnect, reconnectIntervalMs]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    wsRef.current?.close();
    wsRef.current = null;
    setStatus('disconnected');
  }, []);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    connect();
    return () => {
      isMounted.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  return { status, send, connect, disconnect };
}
