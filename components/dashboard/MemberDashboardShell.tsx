import Link from "next/link";
import {
  CalendarClock,
  FileText,
  Mail,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type MemberDashboardShellProps = {
  userName: string | null;
  userEmail: string | null;
  subscriptionStatus: string;
  memberSinceLabel: string;
};

function getFirstName(userName: string | null, userEmail: string | null) {
  const trimmedName = userName?.trim();
  if (trimmedName) {
    return trimmedName.split(/\s+/)[0];
  }

  const emailPrefix = userEmail?.split("@")[0]?.trim();
  if (emailPrefix) {
    return emailPrefix;
  }

  return "Member";
}

export function MemberDashboardShell({
  userName,
  userEmail,
  subscriptionStatus,
  memberSinceLabel,
}: MemberDashboardShellProps) {
  const firstName = getFirstName(userName, userEmail);
  const status = subscriptionStatus || "inactive";
  const isActive = status === "active";

  return (
    <div className="container mx-auto px-4 py-10 md:py-12">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.08] via-card to-card shadow-sm">
            <CardHeader className="gap-4 md:flex md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <Badge className={isActive ? "bg-primary text-primary-foreground" : "bg-amber-100 text-amber-900 hover:bg-amber-100"}>
                  {isActive ? "Membership active" : "Membership pending"}
                </Badge>
                <div>
                  <CardTitle className="text-3xl tracking-tight md:text-4xl">
                    Welcome back, {firstName}
                  </CardTitle>
                  <CardDescription className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Your Present Health dashboard is your member home base for onboarding,
                    care expectations, and the fastest next steps.
                  </CardDescription>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-primary/10 bg-background/80 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Status
                  </p>
                  <p className="mt-2 text-lg font-semibold capitalize text-foreground">{status}</p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-background/80 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Member since
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{memberSinceLabel}</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <CalendarClock className="h-5 w-5 text-primary" />
                  Your first 72 hours
                </CardTitle>
                <CardDescription>
                  Keep the onboarding path clear and low-friction.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <p className="font-semibold text-foreground">1. Welcome call</p>
                  <p className="mt-2">
                    A care-team member will reach out using the number you provided to complete
                    intake and confirm how you want ongoing communication handled.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <p className="font-semibold text-foreground">2. Start with message-first care</p>
                  <p className="mt-2">
                    Use email for anything urgent before intake. Once onboarding is complete,
                    your ongoing primary care plan stays anchored to message, phone, and video when clinically appropriate.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <p className="font-semibold text-foreground">3. Expect business-hour response windows</p>
                  <p className="mt-2">
                    Response-time commitments apply during Monday through Friday, 8am to 8pm ET.
                    Emergency care still goes through 911 or your nearest emergency department.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  What your membership covers
                </CardTitle>
                <CardDescription>
                  Keep expectations sharp so the service stays useful.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="font-semibold text-foreground">Included</p>
                  <p className="mt-2">
                    Messaging-first primary care, ongoing follow-up, medication review,
                    prevention planning, and video or phone visits when clinically appropriate.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="font-semibold text-foreground">Separate charges</p>
                  <p className="mt-2">
                    Labs, imaging, hospital care, specialists, and emergency services remain
                    outside the membership and are billed by third parties.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="font-semibold text-foreground">Best use of the dashboard</p>
                  <p className="mt-2">
                    Treat this as your orientation and action hub: member policies, next steps,
                    and the fastest way to reach the care team.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Membership
              </CardTitle>
              <CardDescription>Status, docs, and core links.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Current status
                </p>
                <p className="mt-2 text-2xl font-semibold capitalize text-foreground">{status}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {isActive
                    ? "Your membership is live and ready for ongoing care."
                    : "Finish setup or re-start checkout to unlock full member access."}
                </p>
              </div>

              <div className="grid gap-3">
                <Button asChild className="w-full justify-start">
                  <a href="mailto:care@presenthealthmd.com">
                    <Mail className="h-4 w-4" />
                    Email care team
                  </a>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/privacy">
                    <ShieldCheck className="h-4 w-4" />
                    Privacy policy
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/terms">
                    <FileText className="h-4 w-4" />
                    Membership terms
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="h-5 w-5 text-primary" />
                Quick actions
              </CardTitle>
              <CardDescription>Use the fastest path for the task at hand.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isActive ? (
                <>
                  <Button asChild className="w-full justify-start">
                    <a href="mailto:care@presenthealthmd.com?subject=Present%20Health%20member%20question">
                      <Mail className="h-4 w-4" />
                      Ask a care question
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link href="/visit">
                      <Stethoscope className="h-4 w-4" />
                      Review single-visit info
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild className="w-full justify-start">
                    <Link href="/join">
                      <Sparkles className="h-4 w-4" />
                      Complete membership
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link href="/login">Return to sign in</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
