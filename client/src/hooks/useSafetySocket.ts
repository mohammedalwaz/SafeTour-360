import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";

export function useSafetySocket(
  token: string | null,
  onEvent: (event: string, payload: unknown) => void,
) {
  useEffect(() => {
    if (!token) return;

    const socket: Socket = io({
      path: "/socket.io",
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1500,
    });

    const events = [
      "sos:created",
      "sos:updated",
      "incident:created",
      "incident:updated",
      "safety:updated",
    ];

    for (const event of events) {
      socket.on(event, (payload: unknown) => onEvent(event, payload));
    }

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [token, onEvent]);
}
