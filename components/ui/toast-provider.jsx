'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import ToastContainer from './toast-container';

// Toast types and their default configurations
const TOAST_TYPES = {
  default: {
    icon: 'ℹ',
    className: 'bg-white text-gray-900 border-gray-200',
    duration: 5000,
  },
  destructive: {
    icon: '✕',
    className: 'bg-red-500 text-white border-red-600',
    duration: 7000,
  },
  success: {
    icon: '✓',
    className: 'bg-green-500 text-white border-green-600',
    duration: 5000,
  },
  warning: {
    icon: '⚠',
    className: 'bg-yellow-500 text-white border-yellow-600',
    duration: 6000,
  },
};

const ToastContext = createContext(null);

export function ToastProvider({ children, position = 'top-right', maxToasts = 5 }) {
  const [toasts, setToasts] = useState([]);

  /**
   * Remove a specific toast by ID
   */
  const dismissToast = useCallback((toastId) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== toastId));
  }, []);

  // Auto-dismiss toasts based on their duration
  useEffect(() => {
    const timeouts = new Map();

    toasts.forEach((toast) => {
      if (toast.duration && toast.duration > 0 && !timeouts.has(toast.id)) {
        const timeout = setTimeout(() => {
          dismissToast(toast.id);
        }, toast.duration);
        timeouts.set(toast.id, timeout);
      }
    });

    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [toasts, dismissToast]);

  /**
   * Add a new toast notification
   */
  const toast = useCallback((options) => {
    const {
      title,
      description,
      variant = 'default',
      action,
      duration,
      persistent = false,
    } = options;

    if (!title && !description) {
      return null;
    }

    const toastConfig = TOAST_TYPES[variant] || TOAST_TYPES.default;
    const toastId = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    const newToast = {
      id: toastId,
      title,
      description,
      variant,
      action,
      persistent,
      duration: persistent ? 0 : (duration ?? toastConfig.duration),
      className: toastConfig.className,
      icon: toastConfig.icon,
      createdAt: Date.now(),
    };

    setToasts((prevToasts) => [...prevToasts, newToast]);
    return toastId;
  }, []);

  /**
   * Remove all toasts
   */
  const dismissAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  /**
   * Update an existing toast
   */
  const updateToast = useCallback((toastId, updates) => {
    setToasts((prevToasts) =>
      prevToasts.map((toast) => (toast.id === toastId ? { ...toast, ...updates } : toast)),
    );
  }, []);

  const contextValue = {
    toasts,
    toast,
    dismissToast,
    dismissAllToasts,
    updateToast,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer position={position} maxToasts={maxToasts} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}
