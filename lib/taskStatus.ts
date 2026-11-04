export type StudentTaskStatus =
  | "not-submitted"
  | "pending"
  | "solved"
  | "partial"
  | "wrong";

export function studentTaskStatus(
  submission:
    | {
        status: string;
        review: { score: number } | null;
      }
    | null
    | undefined,
  maxScore: number,
): StudentTaskStatus {
  if (!submission) return "not-submitted";
  if (submission.status !== "REVIEWED" || !submission.review) return "pending";
  if (submission.review.score >= maxScore && maxScore > 0) return "solved";
  return submission.review.score > 0 ? "partial" : "wrong";
}
