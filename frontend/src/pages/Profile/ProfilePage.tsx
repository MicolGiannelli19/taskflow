import { UserProfile } from "@clerk/react";
import { paths } from "@/routes";

/**
 * Account settings, owned by Clerk: name, avatar, email addresses, password
 * and connected accounts.
 *
 * TaskFlow still keeps `users.name` and `users.avatar` of its own — board
 * member lists and ticket assignees show *other* people, whom Clerk won't
 * expose to the browser. The backend seeds those columns from Clerk when it
 * first sees an account. Changes made here reach that copy on the user's next
 * sign-in; a `user.updated` webhook is the production-grade way to close that
 * gap.
 */
export default function ProfilePage() {
  return (
    <div style={{ display: "grid", placeItems: "start center", padding: "1.5rem" }}>
      <UserProfile routing="path" path={paths.profile} />
    </div>
  );
}
