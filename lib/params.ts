/**
 * Разбирает числовой id из сегмента URL (`params.id`).
 * Возвращает null для нечисловых значений: без этой проверки `Number("abc")` даёт NaN,
 * Prisma бросает ошибку валидации и пользователь получает 500 вместо 404.
 */
export function parseEntityId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}
