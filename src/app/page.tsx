import { listSessions } from "@/lib/sessions";
import NewSessionForm from "@/components/NewSessionForm";

export const dynamic = "force-dynamic";

export default async function Home() {
  const sessions = await listSessions();

  return (
    <>
      <h1>Sessions</h1>
      <p className="muted">
        Describe a design in prose. Claude decomposes it into structured,
        tagged, categorised blocks that you can review, edit, and export.
      </p>

      <NewSessionForm />

      <h2>Saved sessions</h2>
      {sessions.length === 0 ? (
        <p className="muted">No sessions yet. Create one above.</p>
      ) : (
        <ul className="session-list">
          {sessions.map((s) => (
            <li key={s.slug}>
              <a href={`/session/${s.slug}`}>
                <span>{s.name}</span>
                <span className="muted">{s.blockCount} blocks</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
