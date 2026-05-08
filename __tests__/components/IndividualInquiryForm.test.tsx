import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IndividualInquiryForm } from "@/app/inquiry/IndividualInquiryForm";

describe("IndividualInquiryForm", () => {
  it("reveals agent fields when agent toggle is enabled", async () => {
    render(<IndividualInquiryForm />);

    const checkbox = screen.getByLabelText(/this trip is arranged by a tour agent/i);
    await userEvent.click(checkbox);

    expect(screen.getByText(/agent name/i)).toBeInTheDocument();
    expect(screen.getByText(/agent email/i)).toBeInTheDocument();
  });
});
