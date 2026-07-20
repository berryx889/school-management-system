import { useEffect } from 'react';
import { useSettings } from '../hooks/useSettings.js';
import { applyBrandColor } from '../utils/brandColor.js';

// Mounted once inside ProtectedRoute so every authenticated portal re-themes to the
// school's configured brand color (Settings > Brand color) as soon as it loads.
export default function BrandThemeSync() {
  const { data } = useSettings();

  useEffect(() => {
    if (data?.primary_color) applyBrandColor(data.primary_color);
  }, [data?.primary_color]);

  return null;
}
