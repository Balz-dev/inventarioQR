import { CheckCircle, AlertCircle, Info } from 'lucide-react';

function Toast({ message, type = 'success' }) {
  const icons = {
    success: <CheckCircle size={18} />,
    error: <AlertCircle size={18} />,
    info: <Info size={18} />,
  };

  return (
    <div className={`toast ${type}`} role="alert">
      {icons[type]}
      <span>{message}</span>
    </div>
  );
}

export default Toast;
