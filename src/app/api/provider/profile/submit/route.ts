import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/session";
import { assertRole, ForbiddenError } from "@/modules/auth/rbac";
import { submitProfileForReview } from "@/modules/profiles/profile.service";
import {
  ProfileNotFoundError,
  OnboardingIncompleteError,
  VerificationIncompleteError,
} from "@/modules/profiles/types";
import { checkCsrf } from "@/lib/route-helpers";

export async function POST(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    assertRole(user.role, ["PROVIDER"]);
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw error;
  }

  try {
    const profile = await submitProfileForReview(user.id);
    return NextResponse.json({ status: profile.status });
  } catch (error) {
    if (error instanceof ProfileNotFoundError) {
      return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
    }
    if (error instanceof OnboardingIncompleteError) {
      return NextResponse.json({ error: "onboarding_incomplete" }, { status: 409 });
    }
    if (error instanceof VerificationIncompleteError) {
      return NextResponse.json({ error: "verification_incomplete" }, { status: 409 });
    }
    throw error;
  }
}
