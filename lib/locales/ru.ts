// Русский словарь интерфейса — эталон ключей. Казахский (kk.ts) обязан иметь те же ключи.
// Переводим только «обёртку» интерфейса; контент задач/материалов вводят пользователи.
export const ru = {
  "meta.description": "Платформа подготовки школьников Казахстана к олимпиадам по географии",

  // Общее
  "common.email": "Email",
  "common.emailPlaceholder": "you@example.com",
  "common.password": "Пароль",
  "common.min6": "Минимум 6 символов",
  "common.login": "Войти",
  "common.register": "Зарегистрироваться",
  "common.logout": "Выйти",
  "common.teacher": "Учитель",
  "common.student": "Ученик",
  "common.achievements": "Достижения",
  "common.backToLogin": "Вернуться ко входу",

  // Переключатель языка
  "lang.aria": "Язык интерфейса",

  // Главная
  "landing.heroLine1": "От школьной олимпиады —",
  "landing.heroLine2": "до международной",
  "landing.subtitle":
    "Подготовка школьников Казахстана к олимпиадам по географии: группы с учителем, задачи с автопроверкой, интерактивные карты и тренировки на время.",
  "landing.ctaStart": "Начать заниматься",
  "landing.feature1Title": "Картозадачи",
  "landing.feature1Desc": "«Отметьте озеро Балхаш» — ответ кликом по карте, проверка мгновенная.",
  "landing.feature2Title": "Тренировки на время",
  "landing.feature2Desc": "Режим контеста: таймер, одна попытка и разбор ошибок после финиша.",
  "landing.feature3Title": "Прогресс виден",
  "landing.feature3Desc": "Учитель видит, кто что решил; ученик копит стрики и значки.",

  // Вход
  "login.title": "Вход",
  "login.subtitle": "С возвращением в Olympic Meridian",
  "login.forgot": "Забыли пароль?",
  "login.noAccount": "Нет аккаунта?",

  // Регистрация
  "register.title": "Регистрация",
  "register.subtitle": "Аккаунт учителя или ученика",
  "register.name": "Имя",
  "register.namePlaceholder": "Как к вам обращаться",
  "register.role": "Роль",
  "register.roleHint": "Учитель создаёт группы и задачи; ученик вступает в группу по коду приглашения.",
  "register.inviteCode": "Код учителя",
  "register.invitePlaceholder": "Только при регистрации учителем",
  "register.inviteHint": "Ученики оставляют поле пустым. Код учителя выдаёт администратор платформы.",
  "register.submit": "Создать аккаунт",
  "register.haveAccount": "Уже есть аккаунт?",

  // Восстановление пароля
  "forgot.title": "Забыли пароль?",
  "forgot.subtitle": "Пришлём ссылку для сброса на email",
  "forgot.submit": "Отправить ссылку",
  "forgot.remembered": "Вспомнили пароль?",

  // Новый пароль
  "reset.title": "Новый пароль",
  "reset.subtitle": "Задайте новый пароль для входа",
  "reset.newPassword": "Новый пароль",
  "reset.submit": "Сохранить пароль",
  "reset.invalidBefore": "Ссылка недействительна. Запросите новую на странице",
  "reset.invalidLink": "восстановления пароля",

  // Пароль (поле с показом)
  "password.show": "Показать",
  "password.hide": "Скрыть",
  "password.showAria": "Показать пароль",
  "password.hideAria": "Скрыть пароль",

  // Шапка
  "header.toDashboard": "В кабинет",

  // Кабинет
  "dashboard.title": "Личный кабинет",
  "dashboard.createGroup": "Создать группу",
  "dashboard.groupName": "Название",
  "dashboard.groupNamePlaceholder": "Например: Сборная 9-х классов",
  "dashboard.groupDesc": "Описание",
  "dashboard.groupDescPlaceholder": "Чем занимается группа",
  "dashboard.joinGroup": "Вступить в группу",
  "dashboard.joinCodePlaceholder": "Код приглашения, например GEO-ABC12345",
  "dashboard.join": "Вступить",
  "dashboard.newBadges": "Новых",
  "dashboard.badges": "Значков",
  "dashboard.streak": "стрик",
  "dashboard.days": "дн.",
  "dashboard.groups": "Группы",
  "dashboard.newResult": "Новый результат",
  "dashboard.code": "Код",
  "dashboard.emptyTitle": "Групп пока нет",
  "dashboard.emptyTeacher": "Создайте первую группу и отправьте ученикам код приглашения.",
  "dashboard.emptyStudent": "Попросите у учителя код приглашения и вступите в группу.",

  // 404
  "notFound.code": "Ошибка 404",
  "notFound.title": "Вы сошли с маршрута",
  "notFound.desc": "Страница не существует или у вас нет к ней доступа.",
  "notFound.back": "Вернуться в кабинет",
} as const;

export type Dictionary = Record<keyof typeof ru, string>;
