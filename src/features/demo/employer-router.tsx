"use client";
import { useDemo } from "./context";
import { ReadFailure, NotFound } from "@/components/ui/primitives";
import { WorkersView } from "@/features/workers/components/workers-view";
import { CaseView } from "@/features/documents/components/case-view";
import { idSchema } from "./model";
export function EmployerRouter({ segments }: { segments: string[] }) {
  const { readError } = useDemo();
  if (readError) return <ReadFailure />;
  const [section, one, two, three, four] = segments;
  if (section === "workers") {
    if (segments.length === 1) return <WorkersView />;
    if (one === "new" && segments.length === 2)
      return <WorkersView mode="new" />;
    if (!idSchema.safeParse(one).success) return <NotFound />;
    if (segments.length === 2 || (two === "edit" && segments.length === 3))
      return <WorkersView workerId={one} />;
    if (
      two === "employments" &&
      idSchema.safeParse(three).success &&
      (segments.length === 4 || (segments.length === 5 && four === "edit"))
    )
      return (
        <WorkersView
          workerId={one}
          employmentId={three}
          mode={four === "edit" ? "edit" : undefined}
        />
      );
    return <NotFound />;
  }
  const kind =
    section === "pre-arrival"
      ? "PRE_ARRIVAL"
      : section === "visa"
        ? "VISA"
        : section === "work-permits"
          ? "WORK_PERMIT"
          : null;
  if (!kind) return <NotFound />;
  if (segments.length === 1) return <CaseView kind={kind} />;
  if (one === "applications" && segments.length === 2)
    return <CaseView kind={kind} application />;
  if (
    idSchema.safeParse(one).success &&
    (segments.length === 2 || (two === "application" && segments.length === 3))
  )
    return (
      <CaseView kind={kind} stageId={one} application={two === "application"} />
    );
  return <NotFound />;
}
