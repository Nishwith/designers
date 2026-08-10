import { useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

export const useLogProfileView = (designerId) => {
  const lastLogged = useRef(null);

  useEffect(() => {
    if (!designerId || designerId === lastLogged.current) return;

    const logView = async () => {
      lastLogged.current = designerId;
      // Fire-and-forget RPC call (bypasses RLS safely via SECURITY DEFINER)
      const { error } = await supabase.rpc('increment_profile_view', { 
        target_designer_id: designerId 
      });

      if (error) {
        console.error("Failed to track profile view:", error);
      }
    };

    logView();
  }, [designerId]);
};
