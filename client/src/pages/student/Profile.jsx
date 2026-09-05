import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext.jsx";
import { api, apiErrorMessage } from "../../api/client.js";
import { Avatar, PageLoader, SectionHeader } from "../../components/ui.jsx";
export default function Profile() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["student", user.studentId],
    queryFn: () => api.get(`/students/${user.studentId}`).then((r) => r.data),
    enabled: Boolean(user.studentId),
  });
  if (q.isLoading) return <PageLoader />;
  if (q.isError || !q.data)
    return (
      <p role="alert">
        {q.error
          ? apiErrorMessage(q.error)
          : "Your student profile is unavailable. Please contact the school office."}
      </p>
    );
  const s = q.data;
  return (
    <div className="space-y-5">
      <SectionHeader
        title="My profile"
        description="Your official school record. Contact the school office to correct any details."
      />
      <div className="card p-6">
        <div className="flex gap-4 items-center mb-6">
          <Avatar name={s.full_name} photoUrl={s.photo_url} size={64} />
          <h2 className="text-xl font-bold">{s.full_name}</h2>
        </div>
        <dl className="grid gap-5 sm:grid-cols-2">
          {[
            ["Student ID", s.student_code],
            ["Class", s.class_name],
            ["House", s.house_name],
            [
              "Date of birth",
              s.dob
                ? new Date(s.dob).toLocaleDateString()
                : "",
            ],
            ["Gender", s.gender],
            ["Status", s.status],
            ["Parent / guardian", s.parent_name],
            ["Guardian phone", s.parent_phone],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-slate-500">{label}</dt>
              <dd className="font-medium mt-1">{value || "Not recorded"}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
