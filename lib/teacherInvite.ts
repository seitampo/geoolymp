/**
 * Регистрация учителем разрешена только по коду-приглашению — иначе на публичной
 * платформе кто угодно создаёт учительские аккаунты и спамит группами.
 * Код задаёт владелец в переменной окружения TEACHER_INVITE_CODE и раздаёт доверенным
 * учителям. Если код не настроен, регистрация учителем закрыта полностью.
 */
export function isTeacherInviteConfigured() {
  return Boolean(process.env.TEACHER_INVITE_CODE);
}

export function isValidTeacherInvite(code: string) {
  const expected = process.env.TEACHER_INVITE_CODE;
  if (!expected) {
    return false;
  }
  return code === expected;
}
