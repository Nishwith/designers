import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getSession, getUser, getUserProfile, signOut, handleLogout } from '../services/authService';

/** Current auth session (null when anonymous). */
export const useSession = () =>
  useQuery({
    queryKey: ['auth', 'session'],
    queryFn: getSession,
    staleTime: 5 * 60 * 1000, // 5 min — session rarely changes mid-visit
  });

/** Current auth user object. */
export const useCurrentUser = () =>
  useQuery({
    queryKey: ['auth', 'user'],
    queryFn: getUser,
    staleTime: 5 * 60 * 1000,
  });

/**
 * Public users row for the logged-in user.
 * Disabled when no userId is provided (anonymous).
 */
export const useUserProfile = (userId) =>
  useQuery({
    queryKey: ['users', userId],
    queryFn: () => getUserProfile(userId),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

/**
 * Robust logout hook that clears React Query cache, Supabase auth session,
 * storage, and redirects immediately without requiring a page refresh.
 */
export const useLogout = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return (redirectTo = "/login") => signOut(queryClient, navigate, redirectTo);
};

export { signOut, handleLogout };
