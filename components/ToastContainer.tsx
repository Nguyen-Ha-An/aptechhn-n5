/**
 * Toast Container - Displays toast notifications
 */

import React from 'react';
import { useGlobal } from '../context/GlobalContext';
import { Toast } from './ui';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useGlobal();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={() => dismissToast(toast.id)}
        />
      ))}
    </div>
  );
};

export default ToastContainer;
