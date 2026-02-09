import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getAnalytics, logEvent } from 'firebase/analytics';

const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    const analytics = getAnalytics();
    // Mencatat event 'page_view' setiap kali URL berubah
    logEvent(analytics, 'page_view', {
      page_path: location.pathname + location.search,
    });
  }, [location]);
};

export default usePageTracking;