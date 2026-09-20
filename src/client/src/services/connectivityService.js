import { useState, useEffect } from 'react';
import env from '../config/env';

/**
 * Connectivity Management Service
 * 
 * Accurately tracks network reachability and backend API availability
 * without relying solely on navigator.onLine.
 */

let state = {
  isBrowserOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isApiReachable: true,
  status: 'ONLINE', // 'ONLINE' | 'OFFLINE' | 'API_UNREACHABLE' | 'CHECKING'
  lastChecked: new Date(),
  pendingQueueCount: 0
};

const listeners = new Set();
let healthCheckTimer = null;
let isCheckingHealth = false;

function notify() {
  listeners.forEach((listener) => {
    try {
      listener({ ...state });
    } catch (e) {
      console.error('[ConnectivityService] Listener error:', e);
    }
  });
}

/**
 * Ping backend health endpoint with timeout
 */
export async function checkApiHealth() {
  if (isCheckingHealth) return state.isApiReachable;
  isCheckingHealth = true;

  const isBrowserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  state.isBrowserOnline = isBrowserOnline;

  if (!isBrowserOnline) {
    state.isApiReachable = false;
    state.status = 'OFFLINE';
    state.lastChecked = new Date();
    isCheckingHealth = false;
    notify();
    return false;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const healthUrl = `${env.apiUrl}/health`;
    const res = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      state.isApiReachable = true;
      state.status = 'ONLINE';
    } else {
      state.isApiReachable = false;
      state.status = 'API_UNREACHABLE';
    }
  } catch (err) {
    clearTimeout(timeoutId);
    state.isApiReachable = false;
    state.status = state.isBrowserOnline ? 'API_UNREACHABLE' : 'OFFLINE';
  } finally {
    state.lastChecked = new Date();
    isCheckingHealth = false;
    notify();
  }

  return state.isApiReachable;
}

export function updateQueueCount(count) {
  state.pendingQueueCount = count;
  notify();
}

export function subscribeConnectivity(listener) {
  listeners.add(listener);
  listener({ ...state });
  return () => listeners.delete(listener);
}

export function getConnectivityState() {
  return { ...state };
}

// Global browser event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    state.isBrowserOnline = true;
    notify();
    checkApiHealth();
  });

  window.addEventListener('offline', () => {
    state.isBrowserOnline = false;
    state.isApiReachable = false;
    state.status = 'OFFLINE';
    notify();
  });

  // Background interval check every 30 seconds
  healthCheckTimer = setInterval(() => {
    checkApiHealth();
  }, 30000);

  // Initial check on load
  setTimeout(() => {
    checkApiHealth();
  }, 1000);
}

/**
 * React Hook for real-time connectivity status
 */
export function useConnectivity() {
  const [current, setCurrent] = useState(() => getConnectivityState());

  useEffect(() => {
    return subscribeConnectivity(setCurrent);
  }, []);

  return {
    ...current,
    checkNow: checkApiHealth
  };
}

export default {
  checkApiHealth,
  subscribeConnectivity,
  getConnectivityState,
  useConnectivity,
  updateQueueCount
};
