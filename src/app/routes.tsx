import { Route, Routes, useParams } from "react-router-dom";
import { AppShell } from "./AppShell";
import { RequireStudent } from "./RequireStudent";
import { LandingPage } from "./pages/LandingPage";
import { AuthPage } from "./pages/AuthPage";
import { MyActivitiesPage } from "./pages/MyActivitiesPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { OnboardingScreen } from "@/features/onboarding";
import { ActivityDetail, CreateActivity } from "@/features/events";
import { BuddyRequestPanel } from "@/features/matching";
import { AttendanceCheckIn, BuddyChat, PlanView } from "@/features/chat";

/** Canonical route table (Member 1). Feature members export screens; they don't add routes. */
export const ROUTES = {
  home: "/",
  auth: "/auth",
  onboarding: "/onboarding",
  event: (id: string) => `/events/${id}`,
  newActivity: "/activities/new",
  findBuddy: (eventId: string) => `/find-buddy/${eventId}`,
  buddy: (matchId: string) => `/buddy/${matchId}`,
  plan: (matchId: string) => `/plans/${matchId}`,
  checkIn: (matchId: string) => `/meetups/${matchId}/check-in`,
  myActivities: "/my-activities",
} as const;

function P({ render }: { render: (id: string) => JSX.Element }) {
  const { id = "" } = useParams();
  return render(id);
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<LandingPage />} />
        <Route path="auth" element={<AuthPage />} />
        <Route path="onboarding" element={<RequireStudent><OnboardingScreen /></RequireStudent>} />
        <Route path="events/:id" element={<RequireStudent><P render={(id) => <ActivityDetail eventId={id} />} /></RequireStudent>} />
        <Route path="activities/new" element={<RequireStudent><CreateActivity /></RequireStudent>} />
        <Route path="find-buddy/:id" element={<RequireStudent><P render={(id) => <BuddyRequestPanel eventId={id} />} /></RequireStudent>} />
        <Route path="buddy/:id" element={<RequireStudent><P render={(id) => <BuddyChat matchId={id} />} /></RequireStudent>} />
        <Route path="plans/:id" element={<RequireStudent><P render={(id) => <PlanView matchId={id} />} /></RequireStudent>} />
        <Route path="meetups/:id/check-in" element={<RequireStudent><P render={(id) => <AttendanceCheckIn matchId={id} />} /></RequireStudent>} />
        <Route path="my-activities" element={<RequireStudent><MyActivitiesPage /></RequireStudent>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
