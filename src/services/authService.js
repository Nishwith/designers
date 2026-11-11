import { supabase } from './supabaseClient';

/** Get current session (null if anonymous) */
export const getSession = () =>
  supabase.auth.getSession().then(({ data: { session } }) => session);

/** Get current user (null if anonymous) */
export const getUser = () =>
  supabase.auth.getUser().then(({ data: { user } }) => user);

/** Email + password sign in. Returns { user, session }. */
export const signInWithPassword = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

/** Email + password sign up with metadata. Returns { user, session }. */
export const signUp = async (email, password, metadata = {}) => {
  const safeMetadata = { ...metadata };
  const normalizedName = safeMetadata.full_name || safeMetadata.fullName || safeMetadata.name;
  delete safeMetadata.role;
  delete safeMetadata.id;
  delete safeMetadata.email;
  delete safeMetadata.fullName;
  delete safeMetadata.name;
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { ...safeMetadata, ...(normalizedName ? { full_name: normalizedName } : {}) },
      emailRedirectTo: `${window.location.origin}/onboarding`,
    },
  });
  if (authError) throw authError;

  return authData;
};

/** Google OAuth redirect. */
export const signInWithGoogle = async () => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Strictly route back to the designer dashboard natively
      redirectTo: `${origin}/dashboard`,
    },
  });

  if (error) throw error;
  return data;
};

/** Sign out and clear local and query state. */
export const signOut = async (queryClient = null, navigate = null, redirectTo = "/login") => {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.warn("Server signout failed, forcing local cleanup", error);
  } finally {
    if (queryClient) {
      try {
        queryClient.setQueryData(['auth', 'user'], null);
        queryClient.setQueryData(['auth', 'session'], null);
        queryClient.removeQueries({ queryKey: ['auth'] });
        queryClient.removeQueries({ queryKey: ['users'] });
        queryClient.clear();
      } catch {
        // ignore
      }
    }

    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }

    if (navigate && redirectTo) {
      navigate(redirectTo, { replace: true });
    } else if (redirectTo && typeof window !== "undefined") {
      window.location.href = redirectTo;
    }
  }
};

export const handleLogout = signOut;

/** Send password reset email. */
export const sendPasswordResetEmail = async (email) => {
  const redirectOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://designers-v.netlify.app';
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    // This tells the Supabase server to redirect here after verifying the click
    redirectTo: `${redirectOrigin}/update-password`,
  });

  if (error) throw error;
  return data;
};

/** Update current user's password. */
export const updatePassword = async (password) => {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
};

/** Subscribe to auth state changes. Returns unsubscribe function. */
export const onAuthStateChange = (callback) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
};

/** Fetch the public.users row for a given user id and join the designer profile. */
export const getUserProfile = async (userId) => {
  const { data: userProfile, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  if (userError) throw userError;

  const { data: designerProfile, error: designerError } = await supabase
    .from('designers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (designerError) throw designerError;

  const { data: appProfile, error: applicationError } = await supabase
    .from('designer_applications')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (applicationError) throw applicationError;

  return {
    ...userProfile,
    designer: designerProfile,
    application: appProfile,
  };
};

/** Update the public.users row for a given user id. */
export const updateUserProfile = async (userId, updates) => {
  const allowedFields = new Set(["full_name", "phone", "city", "location", "profile_completed"]);
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    throw new Error("Profile updates must be an object.");
  }
  const forbidden = Object.keys(updates).filter((field) => !allowedFields.has(field));
  if (forbidden.length) throw new Error(`Profile update contains protected fields: ${forbidden.join(", ")}`);
  if (!userId) throw new Error("A user ID is required.");
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user || user.id !== userId) throw new Error("Profile updates are limited to the authenticated user.");

  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);
  if (error) throw error;
};
