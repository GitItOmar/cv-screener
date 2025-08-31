'use client';

import { useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * KeyboardHints - Shows keyboard shortcuts for desktop users
 * @param {Object} props - Component properties
 * @param {boolean} props.show - Whether to show hints
 * @param {Object} props.shortcuts - Keyboard shortcuts object
 * @param {boolean} props.canUndo - Whether undo is available
 * @param {boolean} props.isPaused - Whether review is paused
 */
export default function KeyboardHints({ show = true, canUndo = false, isPaused = false }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!show) return null;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className='hidden md:block fixed bottom-4 right-4 z-40'>
      {/* Compact hints when collapsed */}
      {!isExpanded && (
        <div className='flex items-center space-x-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 shadow-lg'>
          <Keyboard className='h-4 w-4 text-gray-600' />
          <div className='flex items-center space-x-2 text-xs text-gray-600'>
            <span>←→</span>
            <span className='text-gray-400'>|</span>
            <span>↑↓</span>
            <span className='text-gray-400'>|</span>
            <Badge variant='outline' className='text-xs px-1 py-0'>
              U
            </Badge>
            <span className='text-gray-400'>|</span>
            <Badge variant='outline' className='text-xs px-1 py-0'>
              Space
            </Badge>
          </div>
          <Button
            variant='ghost'
            size='sm'
            onClick={toggleExpanded}
            className='h-6 w-6 p-0 hover:bg-gray-100'
          >
            <span className='text-xs'>?</span>
          </Button>
        </div>
      )}

      {/* Expanded hints */}
      {isExpanded && (
        <div className='bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg p-4 shadow-xl max-w-xs'>
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center space-x-2'>
              <Keyboard className='h-4 w-4 text-gray-600' />
              <h3 className='font-medium text-sm text-gray-900'>Keyboard Shortcuts</h3>
            </div>
            <Button
              variant='ghost'
              size='sm'
              onClick={toggleExpanded}
              className='h-6 w-6 p-0 hover:bg-gray-100'
            >
              <X className='h-3 w-3' />
            </Button>
          </div>

          <div className='space-y-2 text-xs'>
            <div className='flex items-center justify-between'>
              <span className='text-gray-600'>Accept</span>
              <Badge variant='outline' className='text-xs'>
                →
              </Badge>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-gray-600'>Reject</span>
              <Badge variant='outline' className='text-xs'>
                ←
              </Badge>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-gray-600'>Details</span>
              <Badge variant='outline' className='text-xs'>
                ↑
              </Badge>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-gray-600'>Skip</span>
              <Badge variant='outline' className='text-xs'>
                ↓
              </Badge>
            </div>
            <div className='border-t border-gray-200 pt-2 mt-2' />
            <div className='flex items-center justify-between'>
              <span className={`text-gray-600 ${!canUndo ? 'opacity-50' : ''}`}>Undo</span>
              <Badge variant='outline' className={`text-xs ${!canUndo ? 'opacity-50' : ''}`}>
                U
              </Badge>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-gray-600'>{isPaused ? 'Resume' : 'Pause'}</span>
              <Badge variant='outline' className='text-xs'>
                Space
              </Badge>
            </div>
          </div>

          {/* Status indicators */}
          <div className='mt-3 pt-2 border-t border-gray-200'>
            <div className='flex items-center justify-between text-xs'>
              <span className='text-gray-500'>Status:</span>
              <div className='flex items-center space-x-2'>
                {isPaused && (
                  <Badge variant='secondary' className='text-xs'>
                    Paused
                  </Badge>
                )}
                {canUndo && (
                  <Badge variant='outline' className='text-xs text-blue-600'>
                    Can Undo
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
