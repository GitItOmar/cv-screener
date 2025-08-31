'use client';

import { motion } from 'framer-motion';
import { Check, X, Eye, ArrowUp } from 'lucide-react';
import { useSwipeGestures } from '../hooks/useSwipeGestures';
import { useEffect, useState } from 'react';

/**
 * SwipeContainer - Handles swipe gestures with visual feedback
 * @param {Object} props - Component properties
 * @param {ReactNode} props.children - Content to be wrapped with swipe functionality
 * @param {Function} props.onSwipeLeft - Callback for left swipe (reject)
 * @param {Function} props.onSwipeRight - Callback for right swipe (accept)
 * @param {Function} props.onSwipeUp - Callback for up swipe (details)
 * @param {boolean} props.disabled - Whether swipe is disabled
 * @param {number} props.threshold - Swipe threshold in pixels
 * @param {string} props.className - Additional CSS classes
 */
export default function SwipeContainer({
  children,
  onSwipeLeft = () => {},
  onSwipeRight = () => {},
  onSwipeUp = () => {},
  disabled = false,
  threshold = 50,
  className = '',
}) {
  const [showTutorial, setShowTutorial] = useState(false);

  const { bind, x, y, rotation, opacity, triggerHaptic, getSwipeState } = useSwipeGestures({
    onSwipeLeft: () => {
      triggerHaptic('medium');
      onSwipeLeft();
    },
    onSwipeRight: () => {
      triggerHaptic('success');
      onSwipeRight();
    },
    onSwipeUp: () => {
      triggerHaptic('light');
      onSwipeUp();
    },
    threshold,
    enabled: !disabled,
  });

  const swipeState = getSwipeState();

  // Show tutorial on first mobile visit
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSeenTutorial = window.localStorage.getItem('swipe-tutorial-seen');
      const isMobile = window.innerWidth <= 768;

      if (!hasSeenTutorial && isMobile) {
        setShowTutorial(true);
      }
    }
  }, []);

  const dismissTutorial = () => {
    setShowTutorial(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('swipe-tutorial-seen', 'true');
    }
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Tutorial Overlay */}
      {showTutorial && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'
          onClick={dismissTutorial}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className='bg-white rounded-2xl p-6 max-w-sm mx-auto text-center'
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className='text-xl font-bold mb-4'>Swipe to Review</h3>
            <div className='space-y-3 mb-6'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-2'>
                  <div className='w-8 h-8 bg-red-100 rounded-full flex items-center justify-center'>
                    <X className='w-4 h-4 text-red-600' />
                  </div>
                  <span>Swipe left to reject</span>
                </div>
                <span className='text-2xl'>👈</span>
              </div>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-2'>
                  <div className='w-8 h-8 bg-green-100 rounded-full flex items-center justify-center'>
                    <Check className='w-4 h-4 text-green-600' />
                  </div>
                  <span>Swipe right to accept</span>
                </div>
                <span className='text-2xl'>👉</span>
              </div>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-2'>
                  <div className='w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center'>
                    <Eye className='w-4 h-4 text-blue-600' />
                  </div>
                  <span>Swipe up for details</span>
                </div>
                <span className='text-2xl'>👆</span>
              </div>
            </div>
            <button
              type='button'
              onClick={dismissTutorial}
              className='w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors'
            >
              Got it!
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Swipe Indicators */}
      <div className='absolute inset-0 pointer-events-none z-10'>
        {/* Left (Reject) Indicator */}
        <motion.div
          className='absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-16 h-16 rounded-full bg-red-500'
          initial={{ opacity: 0, scale: 0.5, x: -20 }}
          animate={{
            opacity: swipeState.isSwipingLeft ? swipeState.swipeProgress : 0,
            scale: swipeState.isSwipingLeft ? 0.5 + swipeState.swipeProgress * 0.5 : 0.5,
            x: swipeState.isSwipingLeft ? -20 + swipeState.swipeProgress * 20 : -20,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <X className='w-8 h-8 text-white' strokeWidth={3} />
        </motion.div>

        {/* Right (Accept) Indicator */}
        <motion.div
          className='absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-16 h-16 rounded-full bg-green-500'
          initial={{ opacity: 0, scale: 0.5, x: 20 }}
          animate={{
            opacity: swipeState.isSwipingRight ? swipeState.swipeProgress : 0,
            scale: swipeState.isSwipingRight ? 0.5 + swipeState.swipeProgress * 0.5 : 0.5,
            x: swipeState.isSwipingRight ? 20 - swipeState.swipeProgress * 20 : 20,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <Check className='w-8 h-8 text-white' strokeWidth={3} />
        </motion.div>

        {/* Up (Details) Indicator */}
        <motion.div
          className='absolute top-4 left-1/2 -translate-x-1/2 flex items-center justify-center w-16 h-16 rounded-full bg-blue-500'
          initial={{ opacity: 0, scale: 0.5, y: -20 }}
          animate={{
            opacity: swipeState.isSwipingUp ? swipeState.swipeProgress : 0,
            scale: swipeState.isSwipingUp ? 0.5 + swipeState.swipeProgress * 0.5 : 0.5,
            y: swipeState.isSwipingUp ? -20 + swipeState.swipeProgress * 20 : -20,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <Eye className='w-6 h-6 text-white' strokeWidth={2.5} />
        </motion.div>

        {/* Background Color Overlay */}
        <motion.div
          className='absolute inset-0 rounded-xl pointer-events-none'
          animate={{
            backgroundColor: (() => {
              if (swipeState.isSwipingRight) {
                return `rgba(34, 197, 94, ${swipeState.swipeProgress * 0.1})`;
              }
              if (swipeState.isSwipingLeft) {
                return `rgba(239, 68, 68, ${swipeState.swipeProgress * 0.1})`;
              }
              if (swipeState.isSwipingUp) {
                return `rgba(59, 130, 246, ${swipeState.swipeProgress * 0.1})`;
              }
              return 'transparent';
            })(),
          }}
        />
      </div>

      {/* Main Swipeable Content */}
      <motion.div
        {...bind()}
        style={{
          x,
          y,
          rotate: rotation,
          opacity,
        }}
        className='touch-pan-y cursor-grab active:cursor-grabbing'
        drag={false} // Disable framer-motion's drag since we're using @use-gesture
        whileTap={{ scale: 0.98 }}
      >
        {children}
      </motion.div>

      {/* Swipe Hints for Desktop */}
      <div className='hidden md:block absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-500 opacity-50'>
        <div className='flex items-center space-x-4'>
          <div className='flex items-center space-x-1'>
            <span>←</span>
            <span>Reject</span>
          </div>
          <div className='flex items-center space-x-1'>
            <span>→</span>
            <span>Accept</span>
          </div>
          <div className='flex items-center space-x-1'>
            <ArrowUp className='w-3 h-3' />
            <span>Details</span>
          </div>
        </div>
      </div>
    </div>
  );
}
