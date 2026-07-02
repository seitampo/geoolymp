/**
 * Задел под email-уведомления через Resend (этап 4 дорожной карты).
 *
 * Сейчас уведомления работают только внутри сайта: пометка «Новый результат»
 * держится на Review.seenByStudentAt. Когда подключим Resend, отправка письма
 * добавится здесь — роуты проверки уже вызывают эту функцию, менять их не придётся.
 */
export async function notifyStudentAboutReview(_params: {
  studentEmail: string;
  studentName: string;
  taskTitle: string;
  score: number;
  maxScore: number;
}) {
  // no-op: email добавим при подключении Resend
}
