import { useState } from "react";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { apiErrorMessage } from "@/lib/apiError";
import ProfileForm from "./ProfileForm";
import styles from "./Profile.module.css";

/** "2026-09-01T14:28:24" → "1 September 2026". */
function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface FieldProps {
  label: string;
  /** Rendered as "Not set" when the account has no value for this field. */
  value?: string | null;
}

function Field({ label, value }: FieldProps) {
  const filled = Boolean(value && value.trim());
  return (
    <>
      <dt className={styles.label}>{label}</dt>
      <dd className={filled ? styles.value : styles.unset}>
        {filled ? value : "Not set"}
      </dd>
    </>
  );
}

/**
 * The signed-in user's own account: their details, and a form to change the
 * two the API lets them change — name and profile image.
 */
export default function Profile() {
  // The cached auth user stands in while the request is in flight, so the page
  // opens with a name and avatar instead of a blank card.
  const { user: cached } = useAuth();
  const { data, isLoading, isError, error } = useProfile();
  const profile = data ?? cached;

  // Edits are made against the stored record, so the form waits for the fetch
  // rather than opening on top of a possibly stale cached copy.
  const [editing, setEditing] = useState(false);
  const canEdit = Boolean(data);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Profile</h1>
      </header>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Account</h2>
          {canEdit && !editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Edit profile
            </Button>
          )}
        </div>

        {isError && !profile && (
          <p role="alert" className={styles.error}>
            {apiErrorMessage(error, "Could not load your profile.")}
          </p>
        )}

        {!profile && !isError && <p className={styles.muted}>Loading profile…</p>}

        {profile && editing && data && (
          <ProfileForm profile={data} onDone={() => setEditing(false)} />
        )}

        {profile && !editing && (
          <>
            <div className={styles.identity}>
              <UserAvatar
                name={profile.name}
                email={profile.email}
                avatar={profile.avatar}
                size="lg"
              />
              <div>
                <p className={styles.name}>{profile.name?.trim() || profile.email}</p>
                <p className={styles.email}>{profile.email}</p>
              </div>
            </div>

            {/* A stale cached copy is worth flagging: what's on screen may not
                be what the server holds. */}
            {isError && (
              <p role="alert" className={styles.error}>
                {apiErrorMessage(error, "Could not refresh your profile.")} Showing
                the details saved at sign-in.
              </p>
            )}

            <dl className={styles.fields}>
              <Field label="Name" value={profile.name} />
              <Field label="Email" value={profile.email} />
              <Field label="Member since" value={formatDate(profile.created_at)} />
            </dl>

            {isLoading && <p className={styles.muted}>Refreshing…</p>}
          </>
        )}
      </div>
    </div>
  );
}
