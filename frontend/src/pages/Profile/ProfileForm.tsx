import { useState, type FormEvent } from "react";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";
import { apiErrorMessage } from "@/lib/apiError";
import type { UserType } from "@/types";
import styles from "./Profile.module.css";

interface Props {
  profile: UserType;
  onDone: () => void;
}

/**
 * Edits the two fields PATCH /auth/me accepts: display name and profile image.
 *
 * The image is a URL rather than an upload — the API stores `avatar` as a
 * string and there is no upload endpoint to post a file to.
 */
export default function ProfileForm({ profile, onDone }: Props) {
  const [name, setName] = useState(profile.name ?? "");
  const [avatar, setAvatar] = useState(profile.avatar ?? "");
  const updateProfile = useUpdateProfile();

  const trimmedName = name.trim();
  const trimmedAvatar = avatar.trim();
  const changed =
    trimmedName !== (profile.name ?? "") || trimmedAvatar !== (profile.avatar ?? "");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!changed) return onDone();
    // Both fields go every time: an empty string is how this API clears a
    // value, where omitting the field would mean "leave it as it was".
    updateProfile.mutate(
      { name: trimmedName, avatar: trimmedAvatar },
      { onSuccess: onDone }
    );
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {/* Previews the URL as you type it — a typo shows up as initials here
          rather than after saving. */}
      <div className={styles.identity}>
        <UserAvatar
          name={trimmedName}
          email={profile.email}
          avatar={trimmedAvatar || null}
          size="lg"
        />
        <p className={styles.previewNote}>Preview</p>
      </div>

      <div className={styles.field}>
        <Label htmlFor="profile-name">Name</Label>
        <Input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="How your name appears on tickets and comments"
          autoComplete="name"
        />
      </div>

      <div className={styles.field}>
        <Label htmlFor="profile-avatar">Profile image URL</Label>
        <Input
          id="profile-avatar"
          type="url"
          value={avatar}
          onChange={(e) => setAvatar(e.target.value)}
          placeholder="https://example.com/photo.jpg"
          aria-describedby="profile-avatar-hint"
        />
        <p id="profile-avatar-hint" className={styles.fieldHint}>
          Link to an image. Leave it empty to show your initials instead.
        </p>
      </div>

      <div className={styles.field}>
        <Label htmlFor="profile-email">Email</Label>
        <Input id="profile-email" value={profile.email} readOnly disabled />
        <p className={styles.fieldHint}>
          Your email signs you in and can't be changed here.
        </p>
      </div>

      {updateProfile.isError && (
        <p role="alert" className={styles.error}>
          {apiErrorMessage(updateProfile.error, "Could not save your profile.")}
        </p>
      )}

      <div className={styles.actions}>
        <Button type="submit" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? "Saving…" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onDone}
          disabled={updateProfile.isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
