import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DesignerDashboard from "../pages/DesignerDashboard";

const mocks = vi.hoisted(() => ({
  userId: "verified-designer-user",
  designer: {
    id: 29,
    user_id: "verified-designer-user",
    name: "Studio One",
    city: "Hyderabad",
    projects_completed: null,
    about_text: "",
    experience_years: 2,
    designer_type: "interior",
    style_tags: ["Residential"],
    video_link: "https://youtube.com/watch?v=old1",
    video_link_2: "https://youtube.com/watch?v=old2",
    is_verified: false,
    is_public: true,
    is_subscription_active: false,
    subscription_end: null,
  },
  update: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  getUserProfile: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  leads: [],
  invoke: vi.fn(),
  checkoutOptions: null,
  razorpayOpen: vi.fn(),
}));

const toastMock = vi.hoisted(() => Object.assign(vi.fn(), {
  error: vi.fn(),
  success: vi.fn(),
  loading: vi.fn(),
  dismiss: vi.fn(),
}));

vi.mock("../supabaseClient", () => ({
  supabase: {
    auth: { getSession: vi.fn(async () => ({ data: { session: { user: { id: mocks.userId } } } })) },
    from: mocks.from,
    rpc: mocks.rpc,
    functions: { invoke: mocks.invoke },
    storage: { from: () => ({ upload: vi.fn(), getPublicUrl: vi.fn() }) },
  },
}));
vi.mock("../services/authService", async (importOriginal) => ({
  ...(await importOriginal()),
  getUserProfile: mocks.getUserProfile,
}));
vi.mock("react-hot-toast", () => ({ default: toastMock }));

describe("existing full designer profile editor inside the dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.designer = {
      id: 29,
      user_id: mocks.userId,
      name: "Studio One",
      city: "Hyderabad",
      projects_completed: 1,
      about_text: "hj",
      experience_years: 2,
      designer_type: "interior",
      style_tags: ["Residential"],
      video_link: "https://youtube.com/watch?v=old1",
      video_link_2: "https://youtube.com/watch?v=old2",
      is_verified: true,
      is_public: false,
      is_subscription_active: false,
      subscription_end: null,
    };
    mocks.maybeSingle.mockImplementation(async () => ({ data: mocks.designer, error: null }));
    mocks.leads = [];
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
    mocks.update.mockReturnValue({ eq: vi.fn(async () => ({ error: null })) });
    mocks.from.mockImplementation((table) => {
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        maybeSingle: vi.fn(async () => ({
          data: table === "designers" ? { ...mocks.designer } : table === "users" ? { location: "POINT(78.4867 17.3850)" } : null,
          error: null
        })),
        order: vi.fn(async () => ({ data: table === "connections" ? mocks.leads : [], error: null })),
        update: mocks.update,
      };
      return query;
    });
    mocks.getUserProfile.mockImplementation(async () => ({
      role: "designer",
      application: { id: 21, status: "approved" },
      designer: { ...mocks.designer, is_verified: false, projects_completed: 2, about_text: "Updated studio profile" },
    }));
    mocks.invoke.mockImplementation(async (functionName) => functionName === "create-razorpay-order"
      ? { data: { id: "order_123", amount: 500000, currency: "INR" }, error: null }
      : { data: { success: true }, error: null });
    mocks.checkoutOptions = null;
    mocks.razorpayOpen.mockClear();
    window.sessionStorage.clear();
    window.Razorpay = vi.fn(function Razorpay(options) {
      mocks.checkoutOptions = options;
      this.open = mocks.razorpayOpen;
    });
  });

  it("keeps the full profile editor available and preserves existing profile values", async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route path="/dashboard" element={<DesignerDashboard />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText("Inquiries & Clients")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Activate Your Account" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close activation prompt" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit Profile" }));
    expect(await screen.findByDisplayValue("Studio One")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Profile Settings" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Hyderabad")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("hj")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://youtube.com/watch?v=old1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://youtube.com/watch?v=old2")).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("1"), { target: { value: "2" } });
    fireEvent.change(screen.getByDisplayValue("hj"), { target: { value: "Updated studio profile" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByDisplayValue("Updated studio profile")).toBeInTheDocument();
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      name: "Studio One",
      city: "Hyderabad",
      projects_completed: 2,
      about_text: "Updated studio profile",
      video_link: "https://youtube.com/watch?v=old1",
      video_link_2: "https://youtube.com/watch?v=old2",
    }));
    expect(toastMock.success).toHaveBeenCalledWith("Profile Updated!");
  });

  it("uses the complete existing editor on the standalone completion route and submits the full row", async () => {
    mocks.designer.is_verified = false;
    mocks.designer.projects_completed = null;
    mocks.designer.about_text = "";
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/complete-profile"]}>
          <Routes>
            <Route path="/complete-profile" element={<DesignerDashboard profileOnly />} />
            <Route path="/dashboard" element={<div>Dashboard after submission</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByRole("heading", { name: "Complete Your Professional Profile" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Studio One")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Hyderabad")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://youtube.com/watch?v=old1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://youtube.com/watch?v=old2")).toBeInTheDocument();
    expect(screen.getByText("Change Logo")).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("0"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("About"), { target: { value: "Professional studio profile" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit profile for review" }));

    expect(await screen.findByText("Dashboard after submission")).toBeInTheDocument();
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      name: "Studio One",
      city: "Hyderabad",
      projects_completed: 1,
      about_text: "Professional studio profile",
      video_link: "https://youtube.com/watch?v=old1",
      video_link_2: "https://youtube.com/watch?v=old2",
    }));
    expect(toastMock.success).toHaveBeenCalledWith("Professional profile submitted for admin review.");
  });

  it("does not open payment while the profile is awaiting verification", async () => {
    mocks.designer.is_verified = false;
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes><Route path="/dashboard" element={<DesignerDashboard />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await screen.findByText("Inquiries & Clients");
    expect(window.Razorpay).not.toHaveBeenCalled();
    await waitFor(() => expect(window.initiateRazorpayCheckout).toBeTypeOf("function"));
    window.initiateRazorpayCheckout("subscription");
    expect(toastMock.error).toHaveBeenCalledWith("Payment is available after your professional profile is verified.");
  });

  it("shows the compact review status only on the Profile tab and removes it after verification", async () => {
    mocks.designer.is_verified = false;
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes><Route path="/dashboard" element={<DesignerDashboard />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText("Inquiries & Clients")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Professional Profile Under Review" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit Profile" }));
    expect(await screen.findByRole("heading", { name: "Professional Profile Under Review" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Studio One")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Portfolio" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Professional Profile Under Review" })).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Edit Profile" }));
    expect(await screen.findByRole("heading", { name: "Professional Profile Under Review" })).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("hj"), { target: { value: "Updated while under review" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByDisplayValue("Updated while under review")).toBeInTheDocument();
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ about_text: "Updated while under review" }));
    expect(screen.getByRole("heading", { name: "Professional Profile Under Review" })).toBeInTheDocument();

    mocks.designer.is_verified = true;
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });

    expect(await screen.findByRole("dialog", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Professional Profile Under Review" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Activate Your Account" })).toBeInTheDocument();
  });

  it("detects an administrator verification while the designer dashboard is already open", async () => {
    mocks.designer.is_verified = false;
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes><Route path="/dashboard" element={<DesignerDashboard />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await screen.findByText("Inquiries & Clients");
    expect(window.Razorpay).not.toHaveBeenCalled();

    mocks.designer.is_verified = true;
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Activate Your Account" })).toBeInTheDocument();
    expect(screen.getByText("Inquiries & Clients")).toBeInTheDocument();
    expect(window.Razorpay).not.toHaveBeenCalled();
  });

  it("synchronizes the route-guard profile cache when admin verification arrives", async () => {
    mocks.designer.is_verified = false;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["users", mocks.userId], {
      id: mocks.userId,
      role: "designer",
      application: { id: 21, status: "approved" },
      designer: { ...mocks.designer },
    });
    mocks.getUserProfile.mockImplementation(async () => ({
      id: mocks.userId,
      role: "designer",
      application: { id: 21, status: "approved" },
      designer: { ...mocks.designer },
    }));

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes><Route path="/dashboard" element={<DesignerDashboard />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText("Inquiries & Clients")).toBeInTheDocument();
    expect(queryClient.getQueryData(["users", mocks.userId]).designer.is_verified).toBe(false);

    mocks.designer.is_verified = true;
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });

    expect(await screen.findByRole("dialog", {}, { timeout: 10000 })).toBeInTheDocument();
    await waitFor(() => {
      expect(queryClient.getQueryData(["users", mocks.userId]).designer.is_verified).toBe(true);
    });
    expect(queryClient.getQueryData(["users", mocks.userId]).application).toEqual({ id: 21, status: "approved" });
    expect(screen.getByText("Inquiries & Clients")).toBeInTheDocument();
    expect(mocks.invoke).not.toHaveBeenCalledWith("create-razorpay-order", expect.anything());
  });

  it("shows the activation popup, opens Razorpay on demand and leaves Pay Now after dismissal", async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes><Route path="/dashboard" element={<DesignerDashboard />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await screen.findByText("Inquiries & Clients");
    expect(await screen.findByRole("heading", { name: "Activate Your Account" })).toBeInTheDocument();
    expect(mocks.invoke).not.toHaveBeenCalledWith("create-razorpay-order", expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "Pay & Activate Account" }));
    await waitFor(() => expect(window.Razorpay).toHaveBeenCalledTimes(1));
    expect(mocks.invoke).toHaveBeenCalledWith("create-razorpay-order", {
      body: { tier: "subscription", designer_id: 29 },
    });

    act(() => mocks.checkoutOptions.modal.ondismiss());
    expect(screen.getByText("Inquiries & Clients")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close activation prompt" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Inquiries & Clients")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Billing & Marketing" }));
    expect(await screen.findByRole("button", { name: "Pay Now" })).toBeInTheDocument();
  });

  it("does not create another automatic order after refresh in the same browser session", async () => {
    const firstDashboard = render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes><Route path="/dashboard" element={<DesignerDashboard />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    await screen.findByText("Inquiries & Clients");
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(window.Razorpay).not.toHaveBeenCalled();
    firstDashboard.unmount();

    mocks.invoke.mockClear();
    window.Razorpay.mockClear();
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes><Route path="/dashboard" element={<DesignerDashboard />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await screen.findByText("Inquiries & Clients");
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(window.Razorpay).not.toHaveBeenCalled();
    expect(mocks.invoke).not.toHaveBeenCalledWith("create-razorpay-order", expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "Billing & Marketing" }));
    expect(await screen.findByRole("button", { name: "Pay Now" })).toBeInTheDocument();
  });

  it.each([
    ["pending", "New Requests"],
    ["on_hold", "On Hold"],
    ["accepted", "Active Clients"],
  ])("shows RPC-protected client details for %s inquiries", async (status, tabName) => {
    mocks.leads = [
      {
        id: 101,
        client_id: "client-1",
        designer_id: mocks.designer.id,
        status: "pending",
        message: "Kitchen renovation requirements",
      },
      {
        id: 102,
        client_id: "client-2",
        designer_id: mocks.designer.id,
        status: "on_hold",
        message: "Bedroom project requirements",
      },
      {
        id: 103,
        client_id: "client-3",
        designer_id: mocks.designer.id,
        status: "accepted",
        message: "Living room project requirements",
      },
    ];
    mocks.rpc.mockImplementation(async (functionName, args) => ({
      data: {
        client_name: `Client ${args.p_connection_id}`,
        client_email: `client${args.p_connection_id}@example.com`,
        client_phone: `+91-9000000${args.p_connection_id}`,
        client_city: "Hyderabad",
      },
      error: null,
    }));

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes><Route path="/dashboard" element={<DesignerDashboard />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText("Inquiries & Clients")).toBeInTheDocument();
    if (tabName !== "New Requests") {
      fireEvent.click(screen.getByRole("button", { name: tabName, exact: true }));
    }
    fireEvent.click(await screen.findByRole("button", { name: "View Details" }));

    const contactDetails = screen.getByLabelText("Client contact details");
    const connectionId = status === "pending" ? 101 : status === "on_hold" ? 102 : 103;
    expect(within(contactDetails).getByText(`Client ${connectionId}`)).toBeInTheDocument();
    expect(within(contactDetails).getByText(`client${connectionId}@example.com`)).toBeInTheDocument();
    expect(within(contactDetails).getByText(`+91-9000000${connectionId}`)).toBeInTheDocument();
    expect(screen.getByText(/requirements/i)).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledTimes(3);
    expect(mocks.rpc).toHaveBeenCalledWith("get_assigned_client_details", {
      p_connection_id: connectionId,
    });
  });

  it("handles missing RPC contact fields without hiding inquiry details", async () => {
    mocks.leads = [{
      id: 201,
      designer_id: mocks.designer.id,
      status: "pending",
      message: "Client needs a home office redesign",
    }];
    mocks.rpc.mockResolvedValue({
      data: { client_name: "Client without contact details", client_email: null, client_phone: "", client_city: null },
      error: null,
    });

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes><Route path="/dashboard" element={<DesignerDashboard />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText("Inquiries & Clients")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View Details" }));
    const contactDetails = screen.getByLabelText("Client contact details");
    expect(within(contactDetails).getAllByText("Not provided")).toHaveLength(2);
    expect(screen.getByText(/home office redesign/i)).toBeInTheDocument();
  });

  it("uses legacy connection contact fields if client_id is null", async () => {
    mocks.leads = [{
      id: 202,
      client_id: null,
      client_name: "Legacy Client",
      client_email: "legacy@example.com",
      client_phone: "+91-9111111111",
      client_city: "Pune",
      designer_id: mocks.designer.id,
      status: "pending",
      message: "Legacy inquiry details",
    }];
    mocks.rpc.mockResolvedValue({ data: null, error: null });

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes><Route path="/dashboard" element={<DesignerDashboard />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText("Inquiries & Clients")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View Details" }));
    const contactDetails = screen.getByLabelText("Client contact details");
    expect(within(contactDetails).getByText("Legacy Client")).toBeInTheDocument();
    expect(within(contactDetails).getByText("legacy@example.com")).toBeInTheDocument();
    expect(within(contactDetails).getByText("+91-9111111111")).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledWith("get_assigned_client_details", { p_connection_id: 202 });
  });

  it("keeps the dashboard and inquiry usable when the contact RPC fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.leads = [{
      id: 203,
      designer_id: mocks.designer.id,
      status: "pending",
      message: "Inquiry remains visible after RPC failure",
    }];
    mocks.rpc.mockResolvedValue({ data: null, error: new Error("RPC unavailable") });

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes><Route path="/dashboard" element={<DesignerDashboard />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText("Inquiries & Clients")).toBeInTheDocument();
    expect(screen.getByText("Client inquiry")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View Details" }));
    expect(screen.getByText(/remains visible after RPC failure/i)).toBeInTheDocument();
    expect(screen.getAllByText("Not provided")).toHaveLength(3);
    expect(consoleError).toHaveBeenCalledWith("Unable to load assigned client contact details:", "RPC unavailable");
    consoleError.mockRestore();
  });

  it("verifies payment and preserves the publication setting", async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes><Route path="/dashboard" element={<DesignerDashboard />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await screen.findByText("Inquiries & Clients");
    fireEvent.click(await screen.findByRole("button", { name: "Pay & Activate Account" }));
    await waitFor(() => expect(mocks.checkoutOptions).toBeTruthy());
    await act(async () => {
      await mocks.checkoutOptions.handler({
        razorpay_order_id: "order_123",
        razorpay_payment_id: "payment_123",
        razorpay_signature: "signed",
      });
    });

    expect(mocks.invoke).toHaveBeenCalledWith("verify-razorpay-payment", {
      body: {
        razorpay_order_id: "order_123",
        razorpay_payment_id: "payment_123",
        razorpay_signature: "signed",
        tier: "subscription",
        designer_id: 29,
      },
    });
    expect(toastMock.success).toHaveBeenCalledWith("Payment Successful!", expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "Edit Profile" }));
    await screen.findByRole("heading", { name: "Profile Settings" });
    expect(screen.getAllByRole("combobox").some((select) => select.value === "private")).toBe(true);
  });
});
