import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GroupInquiryForm } from "@/app/inquiry/GroupInquiryForm";

describe("GroupInquiryForm", () => {
  it("reveals agent fields when agent toggle is enabled", async () => {
    render(<GroupInquiryForm />);

    const checkbox = screen.getByLabelText(/this trip is arranged by a tour agent/i);
    await userEvent.click(checkbox);

    expect(screen.getByText(/agent name/i)).toBeInTheDocument();
    expect(screen.getByText(/agent email/i)).toBeInTheDocument();
  });
});
