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
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${window.location.origin}/onboarding`,
    },
  });
  if (authError) throw authError;

  // Explicitly create the user record in public.users table
  if (authData?.user) {
    await supabase.from('users').upsert({
      id: authData.user.id,
      email: authData.user.email,
      full_name: metadata.fullName || metadata.full_name || metadata.name || '',
      phone: metadata.phone || '',
      role: 'designer',
    });
  }

  return authData;
};

/** Google OAuth redirect. */
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // This dynamically grabs the current domain (localhost:5173 or your netlify URL)
      redirectTo: `${window.location.origin}/`
    }
  });

  if (error) throw error;
  return data;
};

/** Sign out and clear local state. */
export const signOut = async () => {
  await supabase.auth.signOut();
  localStorage.clear();
};

/** Send password reset email. */
export const sendPasswordResetEmail = async (email) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    // This tells the Supabase server to redirect here after verifying the click
    redirectTo: 'https://vishwakarmans.netlify.app/update-password',
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
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);
  if (error) throw error;
};
