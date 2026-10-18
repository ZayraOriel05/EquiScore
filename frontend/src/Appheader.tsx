import logo from "./assets/logo.png";

interface Props {
  onHome?: () => void; // logo + name go back to the dashboard once a profile exists
  onProfile?: () => void; // profile icon only appears once a profile exists
  profileActive?: boolean;
}

function Brand() {
  return (
    <>
      <img src={logo} alt="" className="brand-logo" />
      <span className="brand-name">
        <b>Equi</b>Score
      </span>
    </>
  );
}

export default function AppHeader({ onHome, onProfile, profileActive }: Props) {
  return (
    <header className="app-header">
      {onHome ? (
        <button
          type="button"
          className="brand brand-button"
          onClick={onHome}
          aria-label="EquiScore, go to dashboard"
        >
          <Brand />
        </button>
      ) : (
        <div className="brand">
          <Brand />
        </div>
      )}
      {onProfile && (
        <button
          type="button"
          className="profile-button"
          onClick={onProfile}
          aria-label="Your profile"
          aria-current={profileActive ? "page" : undefined}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8.5" r="4" />
            <path d="M4 20.5c0-4.1 3.6-6.5 8-6.5s8 2.4 8 6.5" />
          </svg>
        </button>
      )}
    </header>
  );
}
