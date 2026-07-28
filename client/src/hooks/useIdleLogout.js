import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';

// Signs the user out after a stretch of no activity — protects sessions left open on shared
// school/office computers. Activity just stamps a timestamp (cheap); a periodic check does
// the actual logout. The effect registers ONCE per session (stable deps + a ref for the
// logout action) so ordinary re-renders never reset the idle clock.
const IDLE_MINUTES = 30;
const CHECK_MS = 30 * 1000;
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'mousemove'];

export function useIdleLogout(idleMinutes = IDLE_MINUTES) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const onIdle = useRef(() => {});
  onIdle.current = () => {
    logout();
    toast('Signed out after inactivity. Please sign in again.', 'info');
    navigate('/login');
  };

  useEffect(() => {
    if (!user) return undefined;
    const limit = idleMinutes * 60 * 1000;
    let last = Date.now();
    const mark = () => { last = Date.now(); };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, mark, { passive: true }));

    const interval = setInterval(() => {
      if (Date.now() - last >= limit) {
        clearInterval(interval);
        onIdle.current();
      }
    }, CHECK_MS);

    return () => {
      clearInterval(interval);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, mark));
    };
  }, [user, idleMinutes]);
}
