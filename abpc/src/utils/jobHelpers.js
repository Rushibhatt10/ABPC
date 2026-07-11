export function getPendingSubJobs(subJobs, jobId) {
  return (subJobs || []).filter((sj) => sj.jobId === jobId && sj.status !== "done");
}

export function confirmIncompleteSubJobs(pending, actionLabel = "complete this job") {
  if (!pending?.length) return true;
  const names = pending.map((sj) => `• ${sj.title}`).join("\n");
  return window.confirm(
    `Warning: ${pending.length} sub-task(s) are not marked done:\n\n${names}\n\nAre you sure you want to ${actionLabel} without completing all sub-tasks?`
  );
}

export function confirmIncompleteAmcVisits(logged, required, actionLabel = "complete this AMC") {
  const remaining = Math.max(0, required - logged);
  if (remaining <= 0) return true;
  return window.confirm(
    `Warning: ${remaining} of ${required} scheduled visit(s) have not been logged.\n\nAre you sure you want to ${actionLabel} without logging all visits?`
  );
}
