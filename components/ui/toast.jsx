import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const ToastIcon = ({ variant, className }) => {
  const icons = {
    success: CheckCircle,
    destructive: AlertCircle,
    warning: AlertTriangle,
    default: Info,
  };

  const IconComponent = icons[variant] || Info;
  return <IconComponent className={cn('w-5 h-5', className)} />;
};

const Toast = ({ toast, onDismiss, position = 'top-right' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 150);
  };

  const handleAction = (action) => {
    if (action.onClick) {
      action.onClick();
    }
    if (action.dismissOnClick !== false) {
      handleDismiss();
    }
  };

  const getPositionClasses = (pos) => {
    const positions = {
      'top-left': 'top-4 left-4',
      'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
      'top-right': 'top-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
      'bottom-right': 'bottom-4 right-4',
    };
    return positions[pos] || positions['top-right'];
  };

  const getVariantClasses = (variant) => {
    const variants = {
      default: 'bg-white text-gray-900 border-gray-200',
      destructive: 'bg-red-500 text-white border-red-600',
      success: 'bg-green-500 text-white border-green-600',
      warning: 'bg-yellow-500 text-white border-yellow-600',
    };
    return variants[variant] || variants.default;
  };

  const getIconColor = (variant) => {
    const colors = {
      default: 'text-blue-600',
      destructive: 'text-red-600',
      success: 'text-green-600',
      warning: 'text-yellow-600',
    };
    return colors[variant] || colors.default;
  };

  return (
    <div className={cn('fixed z-50 max-w-sm w-full', getPositionClasses(position))}>
      <div
        className={cn(
          'border rounded-lg shadow-lg p-4 transition-all duration-200 ease-in-out',
          'transform transition-all duration-200',
          isVisible && !isExiting
            ? 'translate-y-0 opacity-100 scale-100'
            : 'translate-y-2 opacity-0 scale-95',
          getVariantClasses(toast.variant),
          'hover:shadow-xl',
        )}
        role='alert'
        aria-live='assertive'
        aria-atomic='true'
      >
        <div className='flex items-start gap-3'>
          {/* Icon */}
          <div className='flex-shrink-0 mt-0.5'>
            <ToastIcon variant={toast.variant} className={getIconColor(toast.variant)} />
          </div>

          {/* Content */}
          <div className='flex-1 min-w-0'>
            {toast.title && <div className='font-semibold mb-1'>{toast.title}</div>}
            {toast.description && <div className='text-sm'>{toast.description}</div>}

            {/* Action */}
            {toast.action && <div className='mt-3'>{toast.action}</div>}
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className='flex-shrink-0 ml-2 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors'
            aria-label='Dismiss notification'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Progress bar for non-persistent toasts */}
        {!toast.persistent && toast.duration > 0 && (
          <div className='absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden'>
            <div
              className='h-full bg-current transition-all duration-linear'
              style={{
                width: '100%',
                transitionDuration: `${toast.duration}ms`,
                animation: 'shrink 1s linear forwards',
              }}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
};

export default Toast;
