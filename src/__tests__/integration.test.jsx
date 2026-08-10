import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { RequireAuth, RequireDesigner, GuestRoute } from '../components/AuthRoutes';
import UnifiedOnboarding from '../pages/UnifiedOnboarding';
import DesignerDashboard from '../pages/DesignerDashboard';
import Waitlist from '../pages/Waitlist';

// Mock the services and hooks
vi.mock('../services/authService', () => ({
  updateUserProfile: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('../services/projectService', () => ({
  createProject: vi.fn(),
  uploadPortfolioFile: vi.fn(),
  insertProjectImages: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({
  useCurrentUser: vi.fn(),
  useUserProfile: vi.fn(),
}));

// Declare the mockSupabaseClient with vi.hoisted so it runs before standard code hoisting
const mockSupabaseClient = vi.hoisted(() => {
  const fromMock = vi.fn((table) => {
    if (table === 'users') {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { role: 'client', profile_completed: false }, error: null }),
            maybeSingle: () => Promise.resolve({ data: { role: 'client', profile_completed: false }, error: null }),
          }),
        }),
        update: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      };
    }
    if (table === 'designer_applications') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
        insert: () => Promise.resolve({ error: null }),
      };
    }
    if (table === 'designers') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({
              data: {
                id: 42,
                user_id: 'designer-user-123',
                name: 'Verified Designer',
                projects_completed: 12,
                about_text: 'I design premium homes.',
                logo_url: 'https://example.com/logo.png',
              },
              error: null,
            }),
          }),
        }),
        insert: () => Promise.resolve({ error: null }),
        update: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      };
    }
    if (table === 'connections') {
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      };
    }
    if (table === 'designer_projects') {
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: { id: 999 }, error: null }),
          }),
        }),
      };
    }
    if (table === 'project_images') {
      return {
        insert: () => Promise.resolve({ error: null }),
      };
    }
    return {
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    };
  });

  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: 'designer-user-123' } } }, error: null }),
      getUser: () => Promise.resolve({ data: { user: { id: 'designer-user-123' } }, error: null }),
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: { path: 'mock-path' }, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/logo.png' } }),
      }),
    },
    from: fromMock,
  };
});

vi.mock('../supabaseClient', () => ({
  supabase: mockSupabaseClient,
}));

vi.mock('../services/supabaseClient', () => ({
  supabase: mockSupabaseClient,
}));

import * as authService from '../services/authService';
import * as projectService from '../services/projectService';
import * as authHooks from '../hooks/useAuth';



describe('Vishwakarmans Integration Tests', () => {
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  test('Unapproved designer is redirected to Waitlist page by Approval Gate', async () => {
    authHooks.useCurrentUser.mockReturnValue({
      data: { id: 'unapproved-user-123', email: 'pending@example.com' },
      isLoading: false,
    });
    authHooks.useUserProfile.mockReturnValue({
      data: {
        id: 'unapproved-user-123',
        role: 'designer',
        profile_completed: true,
        status: 'pending',
        designer: {
          name: 'Pending Designer',
          email: 'pending@example.com',
          phone: '9876543210',
          city: 'Hyderabad',
          designer_type: 'interior',
          experience_years: 5,
          style_tags: ['Modern'],
          about_text: 'This is a premium designer bio.',
        }
      },
      isLoading: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route element={<RequireDesigner />}>
              <Route path="/dashboard" element={<div>Dashboard Content</div>} />
            </Route>
            <Route path="/waitlist" element={<Waitlist />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Application Under Review/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign Out/i })).toBeInTheDocument();
    });
  });

  test('Unauthenticated guest visiting root route sees Unified Onboarding form', async () => {
    authHooks.useCurrentUser.mockReturnValue({
      data: null,
      isLoading: false,
    });
    authHooks.useUserProfile.mockReturnValue({
      data: null,
      isLoading: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<GuestRoute />}>
              <Route path="/" element={<UnifiedOnboarding />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Firm \/ Designer Name/i)).toBeInTheDocument();
    });
  });

  test('Authenticated approved designer visiting root route is redirected to dashboard', async () => {
    authHooks.useCurrentUser.mockReturnValue({
      data: { id: 'designer-user-123', email: 'designer@example.com' },
      isLoading: false,
    });
    authHooks.useUserProfile.mockReturnValue({
      data: {
        id: 'designer-user-123',
        role: 'designer',
        profile_completed: true,
        status: 'approved',
        designer: {
          name: 'Verified Designer',
          email: 'designer@example.com',
          phone: '9876543210',
          city: 'Hyderabad',
          designer_type: 'interior',
          experience_years: 5,
          style_tags: ['Modern'],
          about_text: 'Verified designer bio.',
        }
      },
      isLoading: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<GuestRoute />}>
              <Route path="/" element={<UnifiedOnboarding />} />
            </Route>
            <Route path="/dashboard" element={<div>Designer Dashboard Page</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Designer Dashboard Page/i)).toBeInTheDocument();
    });
  });

  test('Onboarding Guard redirects and form submission completes profile successfully', async () => {
    // 1. Mock auth hooks for incomplete profile
    authHooks.useCurrentUser.mockReturnValue({
      data: { id: 'mock-user-123', email: 'test@example.com' },
      isLoading: false,
    });
    authHooks.useUserProfile.mockReturnValue({
      data: { id: 'mock-user-123', role: 'designer', profile_completed: false },
      isLoading: false,
    });

    // 2. Render UnifiedOnboarding inside Route structure
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/onboarding']}>
          <Routes>
            <Route element={<RequireAuth />}>
              <Route path="/onboarding" element={<UnifiedOnboarding />} />
            </Route>
            <Route path="/waitlist" element={<Waitlist />} />
            <Route path="/" element={<div>Home Page Dashboard</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // 3. Verify onboarding form renders
    await screen.findByText(/Firm \/ Designer Name/i);

    const nameInput = screen.getByPlaceholderText(/Studio Zen/i);
    const phoneInput = screen.getByPlaceholderText(/9876543210/i);
    const termsCheckbox = screen.getByRole('checkbox');

    // 4. Fill form details
    await userEvent.type(nameInput, 'Studio Zen Interior');
    await userEvent.type(phoneInput, '9876543210');
    await userEvent.click(termsCheckbox);

    // Submit Application
    const submitBtn = screen.getByRole('button', { name: /Submit Application/i });
    await userEvent.click(submitBtn);

    // 5. Assert database interactions happened
    await waitFor(() => {
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('designer_applications');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
    });
  });

  test('DesignerDashboard mounts and new project can be published successfully', async () => {
    // 1. Mock auth state to show completed designer profile
    authHooks.useCurrentUser.mockReturnValue({
      data: { id: 'designer-user-123', email: 'designer@example.com' },
      isLoading: false,
    });
    authHooks.useUserProfile.mockReturnValue({
      data: { id: 'designer-user-123', role: 'designer', profile_completed: true },
      isLoading: false,
    });

    // 2. Render DesignerDashboard
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DesignerDashboard />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Wait for the async loading to finish and dashboard to render
    await screen.findByText(/Verified Partner/i);

    // Navigate to "Portfolio" tab first
    const portfolioNavBtn = screen.getByRole('button', { name: /Portfolio/i });
    await userEvent.click(portfolioNavBtn);

    // Click "Add Project" button to open modal
    const addProjectBtn = screen.getByRole('button', { name: /Add Project/i });
    await userEvent.click(addProjectBtn);

    // Verify Title input and description are rendered inside the modal
    const titleInput = screen.getByPlaceholderText(/E.g., Modern Minimalist Villa/i);
    const descTextarea = screen.getByPlaceholderText(/Describe the scope, the materials used/i);
    const publishBtn = screen.getByRole('button', { name: /Publish Complete Project/i });

    // Fill form inputs
    await userEvent.type(titleInput, 'Luxury Living Lounge');
    await userEvent.type(descTextarea, 'A spacious modern living room project.');

    // Select category (Living Room)
    const categoryBtn = screen.getByRole('button', { name: /Living Room/i });
    await userEvent.click(categoryBtn);

    // Attach dummy file
    const file = new File(['dummy content'], 'dummy.png', { type: 'image/png' });
    const fileInput = container.querySelector('input[type="file"]');
    await userEvent.upload(fileInput, file);

    // Trigger form submit
    await userEvent.click(publishBtn);

    // Assert project creation (direct supabase insert in DesignerDashboard.jsx)
    await waitFor(() => {
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('designer_projects');
    });
  });
});
