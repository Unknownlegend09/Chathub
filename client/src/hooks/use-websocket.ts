import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { api } from "@shared/routes";

export interface WSMessage {
  type: string;
  data: any;
}

export function useWebSocket() {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const [typingUsers, setTypingUsers] = useState<Map<number, boolean>>(new Map());
  const [onlineUsers, setOnlineUsers] = useState<Map<number, boolean>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const typingTimeoutRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const connect = useCallback(() => {
    if (!user || wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "auth", userId: user.id }));
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);

        switch (msg.type) {
          case "message":
            queryClient.invalidateQueries({ queryKey: [api.messages.list.path] });
            if (msg.data.receiverId === user.id && msg.data.senderId !== user.id) {
              showNotification(msg.data);
              ws.send(JSON.stringify({ 
                type: "mark_delivered", 
                messageId: msg.data.id 
              }));
            }
            break;

          case "typing":
            setTypingUsers(prev => {
              const next = new Map(prev);
              next.set(msg.data.userId, msg.data.isTyping);
              return next;
            });
            const existingTimeout = typingTimeoutRef.current.get(msg.data.userId);
            if (existingTimeout) clearTimeout(existingTimeout);
            if (msg.data.isTyping) {
              const timeout = setTimeout(() => {
                setTypingUsers(prev => {
                  const next = new Map(prev);
                  next.delete(msg.data.userId);
                  return next;
                });
              }, 3000);
              typingTimeoutRef.current.set(msg.data.userId, timeout);
            }
            break;

          case "status":
            setOnlineUsers(prev => {
              const next = new Map(prev);
              next.set(msg.data.userId, msg.data.isOnline);
              return next;
            });
            queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
            break;

          case "message_delivered":
          case "message_read":
          case "messages_read":
            queryClient.invalidateQueries({ queryKey: [api.messages.list.path] });
            break;

          case "notification":
            break;

          case "user_deleted":
            queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
            break;
        }
      } catch (e) {
        console.error("WebSocket message error:", e);
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [user, queryClient]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  const sendTyping = useCallback((isTyping: boolean, recipientId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        type: "typing", 
        isTyping, 
        recipientId 
      }));
    }
  }, []);

  const markDelivered = useCallback((messageId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        type: "mark_delivered", 
        messageId 
      }));
    }
  }, []);

  const markRead = useCallback((messageId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        type: "mark_read", 
        messageId 
      }));
    }
  }, []);

  return { 
    typingUsers, 
    onlineUsers, 
    sendTyping, 
    markDelivered, 
    markRead 
  };
}

function showNotification(message: any) {
  if (!("Notification" in window)) return;
  
  if (Notification.permission === "granted") {
    new Notification("New Message", {
      body: message.content.substring(0, 100),
      icon: "/favicon.ico",
      tag: `msg-${message.id}`,
    });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification("New Message", {
          body: message.content.substring(0, 100),
          icon: "/favicon.ico",
          tag: `msg-${message.id}`,
        });
      }
    });
  }
}
