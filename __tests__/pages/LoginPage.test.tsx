import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/app/login/page";

const signInWithPassword = jest.fn().mockResolvedValue({ error: null });
const signUp = jest.fn().mockResolvedValue({ error: null });

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword,
      signUp,
    },
  }),
}));

describe("LoginPage", () => {
  it("submits login credentials and navigates to dashboard", async () => {
    const mockRouter = (global as typeof globalThis & { __mockRouter?: any }).__mockRouter;

    render(<LoginPage />);

    await userEvent.type(screen.getByPlaceholderText(/name@company.com/i), "user@example.com");
    await userEvent.type(screen.getByPlaceholderText(/\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022/i), "password123");
    await userEvent.click(screen.getByRole("button", { name: /sign in securely/i }));

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password123",
      });
    });

    expect(mockRouter.push).toHaveBeenCalledWith("/dashboard");
  });
});
