import { useEffect, useRef } from 'react';

export type ChatSocketEvent =
  | {
      type: 'message.new';
      conversation_id: number;
      message: {
        id: number;
        conversation: number;
        sender_id: string | null;
        sender_name: string;
        content: string;
        is_system: boolean;
        is_read: boolean;
        created_at: string;
      };
    }
  | {
      type: 'conversation.read';
      conversation_id: number;
      reader_id: string;
    };

interface Options {
  enabled: boolean;
  onEvent: (event: ChatSocketEvent) => void;
}

const HTTP_BASE = 'http://localhost:8000';

const wsUrlFromHttp = (httpBase: string, path: string, token: string) => {
  const wsScheme = httpBase.startsWith('https') ? 'wss' : 'ws';
  const host = httpBase.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `${wsScheme}://${host}${path}?token=${encodeURIComponent(token)}`;
};

/**
 * Maintains a single WebSocket connection to the chat backend for the
 * lifetime of the authenticated session. Reconnects with backoff on drop.
 */
export function useChatSocket({ enabled, onEvent }: Options) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;

    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let attempts = 0;
    let cancelled = false;

    const connect = () => {
      const token = localStorage.getItem('access_token') ?? localStorage.getItem('token');
      if (!token) {
        // Not logged in yet — try again shortly.
        reconnectTimer = window.setTimeout(connect, 1000);
        return;
      }

      const url = wsUrlFromHttp(HTTP_BASE, '/ws/chat/', token);
      socket = new WebSocket(url);

      socket.onopen = () => {
        attempts = 0;
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ChatSocketEvent;
          handlerRef.current(data);
        } catch {
          // Ignore malformed payloads.
        }
      };

      socket.onclose = () => {
        if (cancelled) return;
        attempts += 1;
        const delay = Math.min(30_000, 500 * 2 ** Math.min(attempts, 6));
        reconnectTimer = window.setTimeout(connect, delay);
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      if (socket) {
        socket.onclose = null;
        socket.onerror = null;
        socket.onmessage = null;
        socket.close();
      }
    };
  }, [enabled]);
}
