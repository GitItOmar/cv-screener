'use client';

import { useEffect, useCallback } from 'react';

/**
 * Custom hook for keyboard navigation in candidate review
 * @param {Object} options - Configuration options
 * @param {Function} options.onAccept - Callback for accept action (right arrow)
 * @param {Function} options.onReject - Callback for reject action (left arrow)
 * @param {Function} options.onDetails - Callback for details action (up arrow)
 * @param {Function} options.onSkip - Callback for skip action (down arrow)
 * @param {Function} options.onUndo - Callback for undo action (U key)
 * @param {Function} options.onPause - Callback for pause/resume action (space)
 * @param {boolean} options.enabled - Whether shortcuts are enabled (default: true)
 * @param {boolean} options.detailsOpen - Whether details drawer is open
 * @returns {Object} Keyboard shortcut state and utilities
 */
export function useKeyboardShortcuts({
  onAccept = () => {},
  onReject = () => {},
  onDetails = () => {},
  onSkip = () => {},
  onUndo = () => {},
  onPause = () => {},
  enabled = true,
  detailsOpen = false,
} = {}) {
  const handleKeyDown = useCallback(
    (event) => {
      if (!enabled) return;

      // Don't trigger shortcuts when user is typing in inputs
      if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA' ||
        event.target.contentEditable === 'true'
      ) {
        return;
      }

      // Don't trigger navigation shortcuts when details drawer is open
      // except for Escape to close
      if (detailsOpen && event.key !== 'Escape') {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          onReject();
          break;
        case 'ArrowRight':
          event.preventDefault();
          onAccept();
          break;
        case 'ArrowUp':
          event.preventDefault();
          onDetails();
          break;
        case 'ArrowDown':
          event.preventDefault();
          onSkip();
          break;
        case 'u':
        case 'U':
          event.preventDefault();
          onUndo();
          break;
        case ' ':
          event.preventDefault();
          onPause();
          break;
        case 'Escape':
          if (detailsOpen) {
            event.preventDefault();
            onDetails(); // Close details
          }
          break;
        default:
          // No action for other keys
          break;
      }
    },
    [enabled, detailsOpen, onAccept, onReject, onDetails, onSkip, onUndo, onPause],
  );

  // Set up event listeners
  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [enabled, handleKeyDown]);

  // Keyboard shortcuts reference
  const shortcuts = {
    'Arrow Left': 'Reject candidate',
    'Arrow Right': 'Accept candidate',
    'Arrow Up': 'View details',
    'Arrow Down': 'Skip candidate',
    U: 'Undo last action',
    Space: 'Pause/Resume',
    Escape: 'Close details (when open)',
  };

  return {
    shortcuts,
    enabled,
  };
}
