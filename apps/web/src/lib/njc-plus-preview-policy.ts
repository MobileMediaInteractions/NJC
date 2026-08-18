import type { premiumPreviewQuestions } from "@harborline/backend/schema";

type Question = Pick<typeof premiumPreviewQuestions.$inferSelect, "id" | "questionType" | "required" | "options">;
type Answer = { questionId: string; value: string | number | boolean };

export function validatePreviewAnswers(questions: Question[], answers: Answer[]) {
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const seen = new Set<string>();

  for (const answer of answers) {
    if (seen.has(answer.questionId)) return "A feedback question can be answered only once";
    seen.add(answer.questionId);
    const question = questionMap.get(answer.questionId);
    if (!question) return "The feedback form changed. Reload before submitting.";
    if (question.questionType === "rating" && (typeof answer.value !== "number" || !Number.isInteger(answer.value) || answer.value < 1 || answer.value > 5)) return "Ratings must be whole numbers from 1 to 5";
    if (question.questionType === "multiple_choice" && (typeof answer.value !== "string" || !question.options.includes(answer.value))) return "Choose one of the available answers";
    if (question.questionType === "yes_no" && typeof answer.value !== "boolean") return "Yes or no questions require a yes or no answer";
    if (question.questionType === "free_response" && typeof answer.value !== "string") return "Written questions require a text answer";
  }

  for (const question of questions.filter((item) => item.required)) {
    const answer = answers.find((item) => item.questionId === question.id);
    if (!answer || (typeof answer.value === "string" && !answer.value.trim())) return "Complete every required question";
  }
  return null;
}

export function nextPreviewViewingStatus(input: {
  currentStatus: string;
  completedAt: Date | null;
  completedNow: boolean;
}) {
  if (input.currentStatus === "feedback_submitted") return "feedback_submitted" as const;
  if (input.completedNow || input.completedAt) return "viewed" as const;
  return "viewing" as const;
}
