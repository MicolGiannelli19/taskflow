import { SignUp } from "@clerk/react";
import { paths } from "@/routes";

/** Registration route. Replaces the old POST /api/auth/register flow. */
export default function SignUpPage() {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100dvh" }}>
      <SignUp
        routing="path"
        path={paths.signUp}
        signInUrl={paths.login}
        forceRedirectUrl={paths.home}
      />
    </div>
  );
}
