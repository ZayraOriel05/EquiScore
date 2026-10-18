import { useEffect, useState } from "react";
import "./App.css";
import AiHelper from "./AiHelper";
import AppHeader from "./Appheader";
import Dashboard from "./Dashboard";
import ProfileForm from "./Profileform";
import {
  ApiError,
  createProfile,
  errorText,
  fetchLoanDetails,
  fetchProfile,
  updateProfile,
} from "./api";
import type { ProfileData, ProfileRecord, UserData } from "./api";

// There is no login. The browser remembers which profile it created.
const STORAGE_KEY = "equiscore_user_id";

type Tab = "dashboard" | "assistant" | "profile";

function readStoredUserId(): number | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const id = raw === null ? NaN : Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [userId, setUserId] = useState<number | null>(readStoredUserId);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(userId !== null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Load the dashboard data whenever the profile is created or edited.
  useEffect(() => {
    if (userId === null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchLoanDetails(userId)
      .then((data) => !cancelled && setUser(data))
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          // The saved profile no longer exists (for example, the database was reset).
          try {
            window.localStorage.removeItem(STORAGE_KEY);
          } catch {
            /* storage unavailable */
          }
          setUser(null);
          setUserId(null);
        } else {
          setError(errorText(err));
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  // Load the saved answers each time the profile page opens.
  useEffect(() => {
    if (tab !== "profile" || userId === null) return;
    let cancelled = false;
    setProfile(null);
    setProfileError(null);
    fetchProfile(userId)
      .then((data) => !cancelled && setProfile(data))
      .catch((err) => !cancelled && setProfileError(errorText(err)));
    return () => {
      cancelled = true;
    };
  }, [tab, userId]);

  async function handleCreate(data: ProfileData) {
    const id = await createProfile(data);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      /* the profile still works until the page is closed */
    }
    setUser(null);
    setLoading(true);
    setTab("dashboard");
    setUserId(id);
  }

  async function handleSave(data: ProfileData) {
    if (userId === null) return;
    await updateProfile(userId, data);
    setReloadKey((k) => k + 1);
  }

  // First visit: collect the profile before showing anything else.
  if (userId === null) {
    return (
      <div className="app app-sage">
        <AppHeader />
        <ProfileForm mode="create" onSubmit={handleCreate} />
      </div>
    );
  }

  return (
    <div className={tab === "profile" ? "app app-sage" : "app"}>
      <AppHeader
        onHome={() => setTab("dashboard")}
        onProfile={() => setTab("profile")}
        profileActive={tab === "profile"}
      />
      {tab === "dashboard" && (
        <Dashboard user={user} loading={loading} error={error} />
      )}
      {tab === "assistant" && <AiHelper userId={userId} />}
      {tab === "profile" &&
        (profile ? (
          <ProfileForm mode="edit" initial={profile} onSubmit={handleSave} />
        ) : (
          <main className="dashboard-status">
            {profileError ?? "Loading your profile…"}
          </main>
        ))}
      <nav className="footer-nav" aria-label="Main navigation">
        <button
          type="button"
          className={tab === "dashboard" ? "selected" : ""}
          aria-current={tab === "dashboard" ? "page" : undefined}
          onClick={() => setTab("dashboard")}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={tab === "assistant" ? "selected" : ""}
          aria-current={tab === "assistant" ? "page" : undefined}
          onClick={() => setTab("assistant")}
        >
          Assistant
        </button>
      </nav>
    </div>
  );
}
