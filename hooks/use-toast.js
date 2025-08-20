import { useState, useCallback, useEffect, useMemo } from 'react';

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

// Toast position configurations
const TOAST_POSITIONS = {
  'top-left': 'top-4 left-4',
  'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
  'bottom-right': 'bottom-4 right-4',
};

/**
 * Custom hook for managing toast notifications
 * @returns {Object} Toast management functions and state
 */
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  /**
   * Remove a specific toast by ID
   * @param {string} toastId - ID of the toast to dismiss
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
   * @param {Object} options - Toast configuration
   * @param {string} [options.title] - Toast title
   * @param {string} [options.description] - Toast description/message
   * @param {string} [options.variant='default'] - Toast variant (default, destructive, success, warning)
   * @param {React.ReactNode} [options.action] - Optional action component
   * @param {number} [options.duration] - Auto-dismiss duration in milliseconds
   * @param {boolean} [options.persistent=false] - Whether toast should persist until manually dismissed
   * @returns {string} Toast ID
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
   * @param {string} toastId - ID of the toast to update
   * @param {Object} updates - Properties to update
   */
  const updateToast = useCallback((toastId, updates) => {
    setToasts((prevToasts) =>
      prevToasts.map((toast) => (toast.id === toastId ? { ...toast, ...updates } : toast)),
    );
  }, []);

  /**
   * Get toast position for rendering
   * @param {string} position - Position preference
   * @returns {Object} Position styles
   */
  const getToastPosition = useCallback((position = 'top-right') => {
    return TOAST_POSITIONS[position] || TOAST_POSITIONS['top-right'];
  }, []);

  return useMemo(() => ({
    toasts,
    toast,
    dismissToast,
    dismissAllToasts,
    updateToast,
    getToastPosition,
  }), [toasts, toast, dismissToast, dismissAllToasts, updateToast, getToastPosition]);
};

export default useToast;
