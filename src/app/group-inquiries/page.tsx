import { createClient } from "@/lib/supabase/server";
import { AppLayout, Header } from "@/components/layout";
import { StatusBadge, Button, Badge } from "@/components/ui";
import Link from "next/link";
import { format } from "date-fns";
import { InquiryStatus } from "@/types/database";

export default async function GroupInquiriesPage() {
  const supabase = await createClient();

  const { data: inquiries, error } = await supabase
    .from("group_inquiries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching group inquiries:", error);
  }

  return (
    <AppLayout>
      <Header
        title="Group Inquiries"
        subtitle={`${inquiries?.length || 0} group travel requests`}
      />

      {!inquiries || inquiries.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-surface-900 mb-1">
            No group inquiries yet
          </h3>
          <p className="text-surface-500 mb-6">
            Group inquiries will appear here when clients submit group booking requests
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-200 bg-surface-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                    Inquiry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                    Group Leader
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                    Group Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                    Travel Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-surface-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 bg-white">
                {inquiries.map((inquiry) => {
                  const totalPax = (inquiry.no_of_adults || 0) + (inquiry.no_of_children || 0);
                  
                  return (
                    <tr
                      key={inquiry.id}
                      className="hover:bg-surface-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/group-inquiries/${inquiry.id}`}
                          className="text-sm font-medium text-primary-600 hover:text-primary-700"
                        >
                          {inquiry.inquiry_number}
                        </Link>
                        <p className="text-xs text-surface-500 mt-0.5">
                          {format(new Date(inquiry.created_at), "MMM d, yyyy")}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-surface-900">
                          {inquiry.head_first_name} {inquiry.head_last_name}
                        </p>
                        <p className="text-xs text-surface-500">
                          {inquiry.client_email}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-surface-900">
                            {totalPax} pax
                          </span>
                          <div className="flex gap-1">
                            <Badge variant="secondary">{inquiry.no_of_adults} adults</Badge>
                            {inquiry.no_of_children > 0 && (
                              <Badge variant="secondary">{inquiry.no_of_children} children</Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-surface-700">
                        {inquiry.arriving_date
                          ? format(new Date(inquiry.arriving_date), "MMM d")
                          : "TBD"}
                        {inquiry.departure_date &&
                          ` - ${format(new Date(inquiry.departure_date), "MMM d")}`}
                        {inquiry.no_of_nights && (
                          <span className="text-surface-500 ml-1">
                            ({inquiry.no_of_nights} nights)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={inquiry.status as InquiryStatus} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/group-inquiries/${inquiry.id}`}>
                          <Button variant="secondary" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
