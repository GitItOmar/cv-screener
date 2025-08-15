import { useToast } from '@/hooks/use-toast';
import Toast from './toast';

const ToastContainer = ({ position = 'top-right', maxToasts = 5 }) => {
  const { toasts, dismissToast } = useToast();

  // Limit the number of visible toasts
  const visibleToasts = toasts.slice(-maxToasts);

  if (visibleToasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {visibleToasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onDismiss={dismissToast}
          position={position}
        />
      ))}
    </div>
  );
};

export default ToastContainer;
