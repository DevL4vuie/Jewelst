import React, { useEffect, useState } from 'react';
import { getLocalImage } from '../../lib/localImageStorage';
import { supabase } from '../../lib/supabase';

export default function DesignImage({ design, alt = '', ...imageProps }) {
  const [resolvedUrl, setResolvedUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';
    let refreshTimer;
    setResolvedUrl('');

    if (!design?.photo_path && !design?.photo_ref) {
      return undefined;
    }

    const loadImage = async () => {
      try {
        if (design.photo_path) {
          if (!supabase) throw new Error('Supabase is not configured.');
          const { data, error } = await supabase.storage
            .from('design-images')
            .createSignedUrl(design.photo_path, 3600);
          if (error) throw error;
          if (!cancelled) setResolvedUrl(data.signedUrl);
          return;
        }

        const blob = await getLocalImage(design.photo_ref);
        if (!blob) throw new Error(`The uploaded image for ${design.name || 'this design'} could not be found.`);
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) URL.revokeObjectURL(objectUrl);
        else setResolvedUrl(objectUrl);
      } catch (error) {
        if (!cancelled) {
          console.error(`Could not load the uploaded image for ${design.name || 'design'}:`, error);
          setResolvedUrl('');
        }
      }
    };

    loadImage();
    if (design.photo_path) refreshTimer = window.setInterval(loadImage, 50 * 60 * 1000);

    return () => {
      cancelled = true;
      if (refreshTimer) window.clearInterval(refreshTimer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [design?.photo_path, design?.photo_ref, design?.name]);

  const src = resolvedUrl || design?.photo_url;
  return src ? <img src={src} alt={alt || design?.name || ''} {...imageProps} /> : null;
}
