import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="offline-indicator" role="status">
      <WifiOff size={12} style={{ verticalAlign: 'middle', marginRight: '0.375rem' }} />
      Sin conexión — Los datos se guardan localmente
    </div>
  );
}

export default OfflineIndicator;
