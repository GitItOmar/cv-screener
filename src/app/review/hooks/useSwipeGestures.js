'use client';

import { useDrag } from '@use-gesture/react';
import { useSpring } from 'framer-motion';

/**
 * Custom hook for swipe gesture detection and handling
 * @param {Object} options - Configuration options
 * @param {Function} options.onSwipeLeft - Callback for left swipe (reject)
 * @param {Function} options.onSwipeRight - Callback for right swipe (accept)
 * @param {Function} options.onSwipeUp - Callback for up swipe (details)
 * @param {number} options.threshold - Minimum distance for swipe detection (default: 50px)
 * @param {number} options.velocityThreshold - Minimum velocity for quick swipes (default: 0.5)
 * @param {boolean} options.enabled - Whether gestures are enabled (default: true)
 * @returns {Object} Gesture handlers and animation values
 */
export function useSwipeGestures({
  onSwipeLeft = () => {},
  onSwipeRight = () => {},
  onSwipeUp = () => {},
  threshold = 50,
  velocityThreshold = 0.5,
  enabled = true,
} = {}) {
  // Animation spring values
  const x = useSpring(0, { stiffness: 300, damping: 30 });
  const y = useSpring(0, { stiffness: 300, damping: 30 });
  const rotation = useSpring(0, { stiffness: 300, damping: 30 });
  const opacity = useSpring(1, { stiffness: 300, damping: 30 });

  /**
   * Animate card out of view
   * @param {string} direction - Direction to animate ('left', 'right', 'up', 'down')
   */
  const animateOut = (direction) => {
    let targetX = 0;
    if (direction === 'right') {
      targetX = window.innerWidth;
    } else if (direction === 'left') {
      targetX = -window.innerWidth;
    }

    let targetY = 0;
    if (direction === 'up') {
      targetY = -window.innerHeight;
    } else if (direction === 'down') {
      targetY = window.innerHeight;
    }

    x.set(targetX);
    y.set(targetY);
    opacity.set(0);
    let rotationValue = 0;
    if (direction === 'right') {
      rotationValue = 30;
    } else if (direction === 'left') {
      rotationValue = -30;
    }
    rotation.set(rotationValue);
  };

  /**
   * Reset card to original position
   */
  const resetPosition = () => {
    x.set(0);
    y.set(0);
    rotation.set(0);
    opacity.set(1);
  };

  // Gesture handler
  const bind = useDrag(
    ({ movement: [mx, my], velocity: [vx, vy], direction: [dx, dy], active, event }) => {
      if (!enabled) return;

      // Prevent default browser behaviors
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      if (active) {
        // During drag - update position and visual feedback
        x.set(mx);
        y.set(my * 0.1); // Reduce vertical movement for horizontal focus

        // Add rotation based on horizontal movement
        const rotationDegree = (mx / window.innerWidth) * 30;
        rotation.set(rotationDegree);

        // Fade out as card moves away
        const distance = Math.sqrt(mx * mx + my * my);
        const maxDistance = window.innerWidth * 0.3;
        const opacityValue = Math.max(0.3, 1 - distance / maxDistance);
        opacity.set(opacityValue);

        // Prevent vertical scrolling during horizontal swipes
        if (Math.abs(mx) > Math.abs(my) && Math.abs(mx) > 10) {
          document.body.style.overflow = 'hidden';
        }
      } else {
        // End of drag - determine action
        document.body.style.overflow = '';

        const absX = Math.abs(mx);
        const absY = Math.abs(my);

        // Check for horizontal swipes
        if (absX > absY) {
          // Right swipe (accept)
          if ((mx > threshold && dx > 0) || (vx > velocityThreshold && dx > 0)) {
            animateOut('right');
            setTimeout(() => {
              onSwipeRight();
              resetPosition();
            }, 200);
            return;
          }

          // Left swipe (reject)
          if ((mx < -threshold && dx < 0) || (vx < -velocityThreshold && dx < 0)) {
            animateOut('left');
            setTimeout(() => {
              onSwipeLeft();
              resetPosition();
            }, 200);
            return;
          }
        } else {
          // Vertical swipes
          if ((my < -threshold && dy < 0) || (vy < -velocityThreshold && dy < 0)) {
            // Up swipe (details)
            onSwipeUp();
          }
        }

        // Reset position if no action triggered
        resetPosition();
      }
    },
    {
      axis: undefined, // Allow all directions
      bounds: { left: -window.innerWidth, right: window.innerWidth },
      rubberband: true,
    },
  );

  /**
   * Trigger haptic feedback on supported devices
   * @param {string} type - Type of haptic feedback
   */
  const triggerHaptic = (type = 'medium') => {
    if (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      window.navigator.vibrate
    ) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [50],
        success: [10, 50, 10],
        error: [50, 10, 50, 10, 50],
      };
      window.navigator.vibrate(patterns[type] || patterns.medium);
    }
  };

  /**
   * Get current swipe state for visual indicators
   * @returns {Object} Current swipe state
   */
  const getSwipeState = () => {
    const currentX = x.get();
    const currentY = y.get();

    const isSwipingRight = currentX > threshold * 0.3;
    const isSwipingLeft = currentX < -threshold * 0.3;
    const isSwipingUp = currentY < -threshold * 0.3;

    return {
      isSwipingRight,
      isSwipingLeft,
      isSwipingUp,
      swipeProgress: Math.min(Math.abs(currentX) / threshold, 1),
      direction: (() => {
        if (isSwipingRight) return 'right';
        if (isSwipingLeft) return 'left';
        if (isSwipingUp) return 'up';
        return null;
      })(),
    };
  };

  return {
    // Gesture binding
    bind: enabled ? bind : () => ({}),

    // Animation values
    x,
    y,
    rotation,
    opacity,

    // Utility functions
    animateOut,
    resetPosition,
    triggerHaptic,
    getSwipeState,

    // Configuration
    threshold,
    velocityThreshold,
    enabled,
  };
}
