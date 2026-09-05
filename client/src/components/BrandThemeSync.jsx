import { useEffect } from 'react';
import { useSettings } from '../hooks/useSettings.js';
import { applyBrandColor, applyAccentColor, applyFavicon } from '../utils/brandColor.js';

// Mounted once inside ProtectedRoute so every authenticated portal re-themes to the
// school's configured brand color (Settings > Brand color) as soon as it loads.
export default function BrandThemeSync() {
  const { data } = useSettings();

  useEffect(() => {
    if (data?.primary_color) applyBrandColor(data.primary_color);
  }, [data?.primary_color]);

  useEffect(() => {
    if (data?.secondary_color) applyAccentColor(data.secondary_color);
  }, [data?.secondary_color]);

  useEffect(() => {
    applyFavicon(data?.favicon_url);
  }, [data?.favicon_url]);

  useEffect(() => {
    if (data?.name) {
      document.documentElement.dataset.schoolName = data.name;
      window.dispatchEvent(new Event('school-brand-change'));
    }
  }, [data?.name]);

  return null;
}
