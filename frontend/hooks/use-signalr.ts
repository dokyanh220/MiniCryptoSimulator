"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import * as signalR from "@microsoft/signalr";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5215";

export interface TickerUpdate {
  symbol: string;
  lastPrice: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  updatedAt: string;
}

export interface CandleUpdate {
  symbol: string;
  interval: string;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  isClosed: boolean;
}

// Global singleton connection and state
let globalConnection: signalR.HubConnection | null = null;
let isGlobalConnected = false;
const globalListeners = new Map<string, Set<(data: any) => void>>();

function getOrCreateConnection() {
  if (typeof window === "undefined") return null; // Avoid running on server

  if (!globalConnection) {
    globalConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/marketHub`)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    globalConnection.onreconnecting(() => { isGlobalConnected = false; window.dispatchEvent(new Event("signalr_state")); });
    globalConnection.onreconnected(() => { isGlobalConnected = true; window.dispatchEvent(new Event("signalr_state")); });
    globalConnection.onclose(() => { isGlobalConnected = false; window.dispatchEvent(new Event("signalr_state")); });

    globalConnection.start()
      .then(() => {
        isGlobalConnected = true;
        window.dispatchEvent(new Event("signalr_state"));
        console.log("✅ SignalR Connected");
      })
      .catch((err) => {
        if (err.message && err.message.includes("stopped during negotiation")) {
          return; // Ignore strict mode abort errors
        }
        console.error("❌ SignalR Connection Error:", err);
      });
  }

  return globalConnection;
}

export function useSignalR() {
  const [isConnected, setIsConnected] = useState(isGlobalConnected);
  const connectionRef = useRef<signalR.HubConnection | null>(getOrCreateConnection());

  useEffect(() => {
    const conn = getOrCreateConnection();
    if (!conn) return;

    const handleStateChange = () => setIsConnected(isGlobalConnected);
    window.addEventListener("signalr_state", handleStateChange);

    // Sync state in case it connected before this component mounted
    if (conn.state === signalR.HubConnectionState.Connected) {
      setIsConnected(true);
      isGlobalConnected = true;
    }

    return () => {
      window.removeEventListener("signalr_state", handleStateChange);
    };
  }, []);

  const on = useCallback((event: string, callback: (data: any) => void) => {
    const conn = getOrCreateConnection();
    if (!conn) return () => {};

    if (!globalListeners.has(event)) {
      globalListeners.set(event, new Set());
      
      // Register exactly ONE signalR handler per event type globally
      conn.on(event, (data: any) => {
        const listeners = globalListeners.get(event);
        listeners?.forEach(cb => cb(data));
      });
    }

    globalListeners.get(event)!.add(callback);

    return () => {
      globalListeners.get(event)?.delete(callback);
    };
  }, []);

  return { isConnected, on, connection: connectionRef };
}
