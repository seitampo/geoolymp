import type { Dictionary } from "./ru";

// Казахский словарь интерфейса. Ключи совпадают с ru.ts (тип Dictionary это гарантирует).
export const kk: Dictionary = {
  "meta.description": "Қазақстан оқушыларын география олимпиадаларына дайындау платформасы",

  // Общее
  "common.email": "Email",
  "common.emailPlaceholder": "you@example.com",
  "common.password": "Құпиясөз",
  "common.min6": "Кемінде 6 таңба",
  "common.login": "Кіру",
  "common.register": "Тіркелу",
  "common.logout": "Шығу",
  "common.teacher": "Мұғалім",
  "common.student": "Оқушы",
  "common.achievements": "Жетістіктер",
  "common.backToLogin": "Кіруге оралу",

  // Переключатель языка
  "lang.aria": "Интерфейс тілі",

  // Главная
  "landing.heroLine1": "Мектеп олимпиадасынан —",
  "landing.heroLine2": "халықаралық деңгейге дейін",
  "landing.subtitle":
    "Қазақстан оқушыларын география олимпиадаларына дайындау: мұғаліммен топтар, автотексерісі бар тапсырмалар, интерактивті карталар және уақытқа арналған жаттығулар.",
  "landing.ctaStart": "Оқуды бастау",
  "landing.feature1Title": "Карта тапсырмалары",
  "landing.feature1Desc": "«Балқаш көлін белгілеңіз» — жауап картаны басу арқылы, тексеру бірден.",
  "landing.feature2Title": "Уақытқа жаттығу",
  "landing.feature2Desc": "Контест режимі: таймер, бір мүмкіндік және фиништен кейін қателерді талдау.",
  "landing.feature3Title": "Прогресс көрінеді",
  "landing.feature3Desc": "Мұғалім кім нені шешкенін көреді; оқушы серпін мен белгілер жинайды.",

  // Вход
  "login.title": "Кіру",
  "login.subtitle": "Olympic Meridian-ге қайта қош келдіңіз",
  "login.forgot": "Құпиясөзді ұмыттыңыз ба?",
  "login.noAccount": "Аккаунт жоқ па?",

  // Регистрация
  "register.title": "Тіркелу",
  "register.subtitle": "Мұғалім немесе оқушы аккаунты",
  "register.name": "Аты",
  "register.namePlaceholder": "Сізге қалай жүгінеміз",
  "register.role": "Рөлі",
  "register.roleHint": "Мұғалім топтар мен тапсырмалар жасайды; оқушы шақыру коды арқылы топқа қосылады.",
  "register.inviteCode": "Мұғалім коды",
  "register.invitePlaceholder": "Тек мұғалім болып тіркелгенде",
  "register.inviteHint": "Оқушылар бұл өрісті бос қалдырады. Мұғалім кодын платформа әкімшісі береді.",
  "register.submit": "Аккаунт жасау",
  "register.haveAccount": "Аккаунтыңыз бар ма?",

  // Восстановление пароля
  "forgot.title": "Құпиясөзді ұмыттыңыз ба?",
  "forgot.subtitle": "Қалпына келтіру сілтемесін email-ге жібереміз",
  "forgot.submit": "Сілтеме жіберу",
  "forgot.remembered": "Құпиясөзді есіңізге түсірдіңіз бе?",

  // Новый пароль
  "reset.title": "Жаңа құпиясөз",
  "reset.subtitle": "Кіру үшін жаңа құпиясөз орнатыңыз",
  "reset.newPassword": "Жаңа құпиясөз",
  "reset.submit": "Құпиясөзді сақтау",
  "reset.invalidBefore": "Сілтеме жарамсыз. Жаңасын мына бетте сұраңыз:",
  "reset.invalidLink": "құпиясөзді қалпына келтіру",

  // Пароль
  "password.show": "Көрсету",
  "password.hide": "Жасыру",
  "password.showAria": "Құпиясөзді көрсету",
  "password.hideAria": "Құпиясөзді жасыру",

  // Шапка
  "header.toDashboard": "Кабинетке",

  // Кабинет
  "dashboard.title": "Жеке кабинет",
  "dashboard.createGroup": "Топ құру",
  "dashboard.groupName": "Атауы",
  "dashboard.groupNamePlaceholder": "Мысалы: 9-сынып құрамасы",
  "dashboard.groupDesc": "Сипаттама",
  "dashboard.groupDescPlaceholder": "Топ немен айналысады",
  "dashboard.joinGroup": "Топқа қосылу",
  "dashboard.joinCodePlaceholder": "Шақыру коды, мысалы GEO-ABC12345",
  "dashboard.join": "Қосылу",
  "dashboard.newBadges": "Жаңа",
  "dashboard.badges": "Белгілер",
  "dashboard.streak": "серпін",
  "dashboard.days": "күн",
  "dashboard.groups": "Топтар",
  "dashboard.newResult": "Жаңа нәтиже",
  "dashboard.code": "Код",
  "dashboard.emptyTitle": "Әзірге топтар жоқ",
  "dashboard.emptyTeacher": "Алғашқы топты құрып, оқушыларға шақыру кодын жіберіңіз.",
  "dashboard.emptyStudent": "Мұғалімнен шақыру кодын сұрап, топқа қосылыңыз.",

  // 404
  "notFound.code": "404 қатесі",
  "notFound.title": "Бағыттан адастыңыз",
  "notFound.desc": "Бет жоқ немесе сізде оған рұқсат жоқ.",
  "notFound.back": "Кабинетке оралу",
};
