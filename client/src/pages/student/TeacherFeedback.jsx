import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, apiErrorMessage } from "../../api/client.js";
import { PageLoader, EmptyState, SectionHeader } from "../../components/ui.jsx";
import { useToast } from "../../components/Toast.jsx";
import { useAuth } from "../../auth/AuthContext.jsx";

export default function TeacherFeedback({ admin = false }) {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["teacher-feedback", admin, user.id, user.school_id],
    queryFn: () =>
      api
        .get(admin ? "/learning/feedback" : "/learning/teachers")
        .then((r) => r.data),
  });
  return (
    <div className="space-y-5">
      <SectionHeader
        title={admin ? "Student feedback" : "Rate teachers"}
        description={
          admin
            ? "Feedback submitted by students, visible only to school administrators."
            : "Share constructive feedback about your teachers. Your name and feedback are visible to school administrators; this is not anonymous."
        }
      />
      {q.isLoading ? (
        <PageLoader />
      ) : q.isError ? (
        <div role="alert">
          <p>{apiErrorMessage(q.error)}</p>
          <button className="btn-secondary" onClick={() => q.refetch()}>
            Try again
          </button>
        </div>
      ) : !q.data.length ? (
        <EmptyState
          title={admin ? "No feedback yet" : "No teachers assigned yet"}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {q.data.map((row) =>
            admin ? (
              <article key={row.id} className="card p-5">
                <h2 className="font-bold">
                  {row.teacher_name} · {row.rating}/5
                </h2>
                <p className="text-sm text-slate-500">
                  From {row.student_name} ·{" "}
                  {new Date(row.updated_at).toLocaleDateString()}
                </p>
                <p className="whitespace-pre-wrap break-words mt-3">
                  {row.comment || "Rating only"}
                </p>
              </article>
            ) : (
              <Rating key={row.id} row={row} />
            ),
          )}
        </div>
      )}
    </div>
  );
}
function Rating({ row }) {
  const [rating, setRating] = useState(row.rating || "");
  const [comment, setComment] = useState(row.comment || "");
  const toast = useToast();
  const save = useMutation({
    mutationFn: () =>
      api.put(`/learning/teachers/${row.id}/feedback`, {
        rating: Number(rating),
        comment,
      }),
    onSuccess: () => toast("Thank you. Your feedback has been saved."),
    onError: (err) => toast(apiErrorMessage(err), "error"),
  });
  return (
    <form
      className="card p-5 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <h2 className="font-bold">{row.full_name}</h2>
      <label className="block">
        Rating
        <select
          className="input mt-1"
          required
          value={rating}
          onChange={(e) => setRating(e.target.value)}
        >
          <option value="">Choose a rating</option>
          {["Needs improvement", "Fair", "Good", "Very good", "Excellent"].map(
            (v, i) => (
              <option key={v} value={i + 1}>
                {i + 1} — {v}
              </option>
            ),
          )}
        </select>
      </label>
      <label className="block">
        Comments (optional)
        <textarea
          className="input mt-1"
          maxLength={2000}
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </label>
      <button className="btn-primary" disabled={save.isPending}>
        Save feedback
      </button>
    </form>
  );
}
