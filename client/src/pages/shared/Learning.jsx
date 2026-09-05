import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client.js";
import { useAuth } from "../../auth/AuthContext.jsx";
import {
  PageLoader,
  EmptyState,
  Modal,
  SectionHeader,
} from "../../components/ui.jsx";
import { useToast } from "../../components/Toast.jsx";

const sections = {
  homework: "Homework",
  library: "My library",
  examinations: "Examinations",
  "online-classes": "Online classes",
};
const descriptions = {
  homework:
    "Read your assignments, submit answers, and see your teacher’s feedback.",
  library: "Reading materials and learning resources selected for your class.",
  examinations: "Exam dates, preparation instructions, and published results.",
  "online-classes":
    "Upcoming lessons and meeting links shared by your teachers.",
};
const dateLabel = (kind) => (kind === "homework" ? "Deadline" : "Session date");
const showDate = (value) =>
  value
    ? new Date(value).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

export default function Learning({ kind: fixedKind }) {
  const { user } = useAuth();
  const student = user.role === "student";
  const [section, setSection] = useState("homework");
  const kind = fixedKind || section;
  const [classId, setClassId] = useState("");
  const [editor, setEditor] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [review, setReview] = useState(null);
  const toast = useToast();
  const client = useQueryClient();
  const classes = useQuery({
    queryKey: ["learning-classes"],
    queryFn: () => api.get("/learning/classes").then((r) => r.data),
    enabled: !student,
  });
  const chosenClass = classId || classes.data?.[0]?.id || "";
  const query = useQuery({
    queryKey: ["learning", kind, chosenClass, user.id],
    queryFn: () =>
      api
        .get("/learning/posts", { params: { kind, class_id: chosenClass } })
        .then((r) => r.data),
    enabled: student || Boolean(chosenClass),
  });
  const archive = useMutation({
    mutationFn: (id) => api.delete(`/learning/posts/${id}`),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["learning"] });
      toast("Item archived.");
    },
    onError: (err) => toast(apiErrorMessage(err), "error"),
  });
  return (
    <div className="space-y-5">
      <SectionHeader
        title={student ? sections[kind] : "Learning centre"}
        description={
          student
            ? descriptions[kind]
            : "Publish resources and activities for your classes, then review homework submissions."
        }
      />
      {!student && (
        <div className="card p-4 flex flex-wrap gap-3">
          <label className="flex-1">
            Section
            <select
              className="input mt-1"
              value={kind}
              onChange={(e) => setSection(e.target.value)}
            >
              {Object.entries(sections).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1">
            Class
            <select
              className="input mt-1"
              value={chosenClass}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="" disabled>
                Choose a class
              </option>
              {classes.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="btn-primary self-end"
            disabled={!chosenClass}
            onClick={() =>
              setEditor({
                title: "",
                description: "",
                url: "",
                scheduled_at: "",
              })
            }
          >
            Add {kind === "library" ? "resource" : "activity"}
          </button>
        </div>
      )}
      {(query.isError || classes.isError) && (
        <div className="card p-5" role="alert">
          <p>{apiErrorMessage(query.error || classes.error)}</p>
          <button
            className="btn-secondary mt-3"
            onClick={() => {
              query.refetch();
              if (!student) classes.refetch();
            }}
          >
            Try again
          </button>
        </div>
      )}
      {query.isLoading || (!student && classes.isLoading) ? (
        <PageLoader />
      ) : (
        !query.isError && (
          <>
            {!query.data?.length && (
              <div className="card">
                <EmptyState
                  title={`No ${sections[kind].toLowerCase()} published yet`}
                  description={
                    student
                      ? "Items will appear here when your school publishes them for your class."
                      : "Choose a class and add the first activity or resource."
                  }
                />
              </div>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              {query.data?.map((post) => (
                <article className="card p-5 space-y-3" key={post.id}>
                  <div>
                    <h2 className="font-bold text-lg text-slate-900 break-words">
                      {post.title}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Shared by {post.author_name}
                    </p>
                  </div>
                  {post.scheduled_at && (
                    <p className="text-sm font-medium text-primary-700">
                      {dateLabel(kind)}: {showDate(post.scheduled_at)}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words text-sm text-slate-600">
                    {post.description}
                  </p>
                  {post.url && (
                    <a
                      className="btn-secondary"
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {kind === "online-classes"
                        ? "Join online class"
                        : "Open resource"}{" "}
                      ↗
                    </a>
                  )}
                  {student && kind === "homework" && (
                    <div className="border-t pt-3 space-y-2">
                      <p className="text-sm font-semibold">
                        {post.reviewed_at
                          ? "Reviewed"
                          : post.submitted_at
                            ? `Submitted ${showDate(post.submitted_at)}`
                            : "Not submitted"}
                      </p>
                      {post.answer && (
                        <details className="text-sm">
                          <summary className="cursor-pointer">
                            Your submitted answer
                          </summary>
                          <p className="whitespace-pre-wrap break-words mt-2">
                            {post.answer}
                          </p>
                        </details>
                      )}
                      {post.feedback && (
                        <div className="bg-primary-50 rounded-xl p-3">
                          <p className="font-semibold text-sm">
                            Teacher feedback
                          </p>
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {post.feedback}
                          </p>
                        </div>
                      )}
                      {!post.reviewed_at &&
                      (!post.scheduled_at ||
                        new Date(post.scheduled_at) >= new Date()) ? (
                        <button
                          className="btn-primary"
                          onClick={() => setAnswer(post)}
                        >
                          {post.submitted_at
                            ? "Update answer"
                            : "Submit homework"}
                        </button>
                      ) : (
                        !post.reviewed_at && (
                          <p className="text-sm text-amber-700">
                            Deadline passed. Contact your teacher if you need
                            more time.
                          </p>
                        )
                      )}
                    </div>
                  )}
                  {post.can_edit && (
                    <div className="flex flex-wrap gap-2 border-t pt-3">
                      <button
                        className="btn-secondary"
                        onClick={() => setEditor(post)}
                      >
                        Edit
                      </button>
                      {kind === "homework" && (
                        <button
                          className="btn-secondary"
                          onClick={() => setReview(post)}
                        >
                          Review submissions
                        </button>
                      )}
                      <button
                        className="btn-ghost"
                        disabled={archive.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Archive this item? Existing submissions will be kept.",
                            )
                          )
                            archive.mutate(post.id);
                        }}
                      >
                        Archive
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )
      )}
      {student && kind === "examinations" && (
        <Link className="btn-primary" to="/student/results">
          View published results
        </Link>
      )}
      {editor && (
        <Editor
          initial={editor}
          kind={kind}
          classId={chosenClass}
          onClose={() => setEditor(null)}
        />
      )}
      {answer && <Answer post={answer} onClose={() => setAnswer(null)} />}
      {review && <Review post={review} onClose={() => setReview(null)} />}
    </div>
  );
}

function Editor({ initial, kind, classId, onClose }) {
  const localDate = initial.scheduled_at
    ? new Date(
        new Date(initial.scheduled_at).getTime() -
          new Date(initial.scheduled_at).getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16)
    : "";
  const [form, setForm] = useState({ ...initial, scheduled_at: localDate });
  const client = useQueryClient();
  const toast = useToast();
  const save = useMutation({
    mutationFn: () =>
      api[initial.id ? "put" : "post"](
        `/learning/posts${initial.id ? `/${initial.id}` : ""}`,
        {
          ...form,
          kind,
          class_id: Number(classId),
          scheduled_at: form.scheduled_at
            ? new Date(form.scheduled_at).toISOString()
            : null,
        },
      ),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["learning"] });
      toast("Published to the student portal.");
      onClose();
    },
    onError: (err) => toast(apiErrorMessage(err), "error"),
  });
  const field = (key) => ({
    value: form[key] || "",
    onChange: (e) => setForm({ ...form, [key]: e.target.value }),
  });
  return (
    <Modal
      open
      onClose={onClose}
      title={initial.id ? "Edit activity" : "Publish activity"}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <label className="block">
          Title
          <input
            className="input mt-1"
            required
            maxLength={160}
            {...field("title")}
          />
        </label>
        <label className="block">
          Instructions / description
          <textarea
            className="input mt-1"
            rows={5}
            maxLength={10000}
            {...field("description")}
          />
        </label>
        <label className="block">
          {kind === "online-classes"
            ? "Meeting link (HTTPS)"
            : "Resource link (HTTPS)"}
          <input
            className="input mt-1"
            type="url"
            required={["library", "online-classes"].includes(kind)}
            maxLength={2000}
            {...field("url")}
          />
        </label>
        {kind !== "library" && (
          <label className="block">
            {dateLabel(kind)} (your local time)
            <input
              className="input mt-1"
              type="datetime-local"
              required
              {...field("scheduled_at")}
            />
          </label>
        )}
        <button className="btn-primary" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Publish"}
        </button>
      </form>
    </Modal>
  );
}
function Answer({ post, onClose }) {
  const [answer, setAnswer] = useState(post.answer || "");
  const client = useQueryClient();
  const toast = useToast();
  const save = useMutation({
    mutationFn: () => api.put(`/learning/posts/${post.id}/answer`, { answer }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["learning"] });
      toast("Homework submitted.");
      onClose();
    },
    onError: (err) => toast(apiErrorMessage(err), "error"),
  });
  return (
    <Modal open onClose={onClose} title={post.title}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <label className="block">
          Your answer
          <textarea
            className="input mt-2"
            rows={9}
            required
            maxLength={20000}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
        </label>
        <button className="btn-primary" disabled={save.isPending}>
          {save.isPending ? "Submitting…" : "Submit answer"}
        </button>
      </form>
    </Modal>
  );
}
function Review({ post, onClose }) {
  const q = useQuery({
    queryKey: ["submissions", post.id],
    queryFn: () =>
      api.get(`/learning/posts/${post.id}/submissions`).then((r) => r.data),
  });
  return (
    <Modal open onClose={onClose} title={`Submissions: ${post.title}`}>
      {q.isLoading ? (
        <PageLoader />
      ) : q.isError ? (
        <p role="alert">{apiErrorMessage(q.error)}</p>
      ) : !q.data.length ? (
        <EmptyState title="No submissions yet" />
      ) : (
        <div className="space-y-6">
          {q.data.map((row) => (
            <ReviewRow key={row.id} row={row} />
          ))}
        </div>
      )}
    </Modal>
  );
}
function ReviewRow({ row }) {
  const [feedback, setFeedback] = useState(row.feedback || "");
  const toast = useToast();
  const save = useMutation({
    mutationFn: () =>
      api.put(`/learning/submissions/${row.id}/feedback`, { feedback }),
    onSuccess: () => toast("Feedback shared."),
    onError: (err) => toast(apiErrorMessage(err), "error"),
  });
  return (
    <form
      className="border-b pb-5 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <h3 className="font-bold">{row.full_name}</h3>
      <p className="text-xs text-slate-500">{showDate(row.submitted_at)}</p>
      <p className="whitespace-pre-wrap break-words text-sm">{row.answer}</p>
      <label className="block text-sm">
        Feedback
        <textarea
          className="input mt-1"
          required
          maxLength={5000}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
      </label>
      <button className="btn-secondary" disabled={save.isPending}>
        Share feedback
      </button>
    </form>
  );
}
