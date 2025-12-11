import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { getApiUrl } from "@/lib/query-client";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  emit: (event: string, data: any) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  emit: () => {},
});

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const apiUrl = getApiUrl();
    const newSocket = io(apiUrl, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
      newSocket.emit("user_connected", { userId: user.id });
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user]);

  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, emit }}>
      {children}
    </SocketContext.Provider>
  );
}
