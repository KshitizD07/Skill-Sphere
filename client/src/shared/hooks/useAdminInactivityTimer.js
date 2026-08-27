import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BaseAPI from '../../services/BaseAPI';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export function useAdminInactivityTimer(user, onSessionDemoted, toast) {
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const lastActivityRef = useRef(0);

  const executeDemotion = useCallback(async () => {
    try {
      const res = await BaseAPI.post('/auth/demote', {});
      const data = res?.data || res;

      if (data?.user) {
        localStorage.setItem('user_data', JSON.stringify(data.user));
      }
      if (data?.token) {
        localStorage.setItem('ss_token', data.token);
      }

      onSessionDemoted?.(data?.user);
      if (toast?.warning) {
        toast.warning('Admin session logged out due to 15 minutes of inactivity');
      }
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to execute automatic demotion:', err);
    }
  }, [navigate, onSessionDemoted, toast]);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      executeDemotion();
    }, INACTIVITY_TIMEOUT_MS);
  }, [executeDemotion]);

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Initial timer start
    resetTimer();

    // Throttled activity listener
    let throttleTimeout = null;
    const handleUserActivity = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          throttleTimeout = null;
          resetTimer();
        }, 5000); // Throttle activity resets to every 5 seconds max
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (throttleTimeout) clearTimeout(throttleTimeout);
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
    };
  }, [user?.role, resetTimer]);
}
