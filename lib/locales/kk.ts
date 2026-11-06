import type { Dictionary } from "./ru";

// Казахский словарь интерфейса. Ключи совпадают с ru.ts (тип Dictionary это гарантирует).
export const kk: Dictionary = {
  "meta.description":
    "Қазақстан оқушыларын география олимпиадаларына дайындау платформасы",

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
  "landing.feature1Desc":
    "«Балқаш көлін белгілеңіз» — жауап картаны басу арқылы, тексеру бірден.",
  "landing.feature2Title": "Уақытқа жаттығу",
  "landing.feature2Desc":
    "Контест режимі: таймер, бір мүмкіндік және фиништен кейін қателерді талдау.",
  "landing.feature3Title": "Прогресс көрінеді",
  "landing.feature3Desc":
    "Мұғалім кім нені шешкенін көреді; оқушы серпін мен белгілер жинайды.",

  // Вход
  "login.title": "Кіру",
  "login.identifier": "Email немесе логин",
  "login.identifierPlaceholder": "Email немесе логиніңіз",
  "login.subtitle": "Olympic Meridian-ге қайта қош келдіңіз",
  "login.forgot": "Құпиясөзді ұмыттыңыз ба?",
  "login.noAccount": "Аккаунт жоқ па?",

  // Регистрация
  "register.title": "Тіркелу",
  "register.subtitle": "Мұғалім немесе оқушы аккаунты",
  "register.name": "Аты",
  "register.namePlaceholder": "Сізге қалай жүгінеміз",
  "register.role": "Рөлі",
  "register.roleHint":
    "Мұғалім топтар мен тапсырмалар жасайды; оқушы шақыру коды арқылы топқа қосылады.",
  "register.inviteCode": "Мұғалім коды",
  "register.invitePlaceholder": "Тек мұғалім болып тіркелгенде",
  "register.inviteHint":
    "Оқушылар бұл өрісті бос қалдырады. Мұғалім кодын платформа әкімшісі береді.",
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
  "dashboard.emptyTeacher":
    "Алғашқы топты құрып, оқушыларға шақыру кодын жіберіңіз.",
  "dashboard.emptyStudent": "Мұғалімнен шақыру кодын сұрап, топқа қосылыңыз.",

  // 404
  "notFound.code": "404 қатесі",
  "notFound.title": "Бағыттан адастыңыз",
  "notFound.desc": "Бет жоқ немесе сізде оған рұқсат жоқ.",
  "notFound.back": "Кабинетке оралу",

  // Общее (действия/поля)
  "action.add": "Қосу",
  "action.create": "Құру",
  "action.save": "Сақтау",
  "action.edit": "Өңдеу",
  "action.delete": "Жою",
  "action.open": "Ашу",
  "action.download": "Жүктеу",
  "action.find": "Табу",
  "action.reset": "Тазалау",
  "action.apply": "Қолдану",
  "field.title": "Атауы",
  "field.description": "Сипаттама",

  // Типы задач
  "task.manualReview": "Жауап кілті жоқ — мұғалім тексереді",
  "task.openIllustration": "Суретті толық ашу",
  "taskType.TEXT": "Мәтінмен жауап",
  "taskType.SINGLE_CHOICE": "Бір дұрыс нұсқа",
  "taskType.MULTIPLE_CHOICE": "Бірнеше дұрыс нұсқа",
  "taskType.IMAGE_UPLOAD": "Сурет жүктеу",
  "taskType.FILE_UPLOAD": "Файл тіркеу",
  "taskType.MAP_POINT": "Картада белгілеу",
  // Типы материалов
  "materialType.TEXT": "Тек мәтін (файлсыз және сілтемесіз)",
  "materialType.TEXT_badge": "Мәтін",
  "materialType.PDF": "PDF",
  "materialType.DOCX": "DOCX",
  "materialType.PPTX": "PPTX",
  "materialType.IMAGE": "Сурет",
  "materialType.LINK": "Сыртқы ресурсқа сілтеме",
  "materialType.LINK_badge": "Сілтеме",
  "materialType.ZIP": "ZIP архив",
  // Статусы решений
  "status.PENDING": "Тексерілуде",
  "status.REVIEWED": "Тексерілді",

  // Страница группы: шапка и вкладки
  "group.back": "Топтарға оралу",
  "group.inviteCode": "Шақыру коды",
  "group.deleteGroup": "Топты жою",
  "group.navAria": "Топ бөлімдері",
  "group.tabMaterials": "Материалдар",
  "group.tabTasks": "Тапсырмалар",
  "group.tabSets": "Сабақтар",
  "group.tabSubmissions": "Тексеруге",
  "group.tabMembers": "Оқушылар",
  "group.newResultDot": "Жаңа нәтиже бар",

  // Прогресс ученика
  "progress.title": "Менің прогресім",
  "progress.materials": "Материалдар",
  "progress.tasksSolved": "Шешілген тапсырмалар",
  "progress.avgScore": "Орташа балл",

  // Поиск/фильтры
  "search.noResults": "Ештеңе табылмады",
  "search.materialsPlaceholder": "Материалдардан іздеу",
  "search.tasksPlaceholder": "Тапсырмалардан іздеу",
  "search.noMaterialsDesc":
    "Сұрауыңыз бойынша материал жоқ. Сұрауды өзгертіп көріңіз.",
  "search.noTasksFiltered": "Іздеу сұрауын немесе сүзгілерді өзгертіп көріңіз.",
  "search.noTasks": "Тапсырмалар табылмады.",
  "filter.aria": "Тапсырмаларды күйі бойынша сүзу",
  "sort.label": "Сұрыптау",
  "sort.pendingFirst": "Алдымен тексерілмегендер",
  "sort.byTask": "Тапсырма бойынша",
  "sort.byStudent": "Оқушы бойынша",
  "sort.newest": "Алдымен жаңалары",
  "filter.all": "Барлығы",
  "filter.notSubmitted": "Жіберілмеген",
  "filter.pending": "Тексерілуде",
  "filter.solved": "Шешілді",

  // Материалы
  "material.add": "+ Материал қосу",
  "material.url": "Сыртқы ресурсқа сілтеме (міндетті емес)",
  "material.urlPlaceholder": "Тек «Сілтеме» түрі үшін",
  "material.file": "Файл (міндетті емес)",
  "material.fileHintPrefix": "Тек файлдық түрлер үшін, дейін",
  "material.newFile": "Жаңа файл (міндетті емес)",
  "material.typeLabel": "Материал түрі",
  "material.studied": "Оқылды",
  "material.uploadedAt": "Жүктелген күні",
  "material.fileName": "Файл",
  "material.markStudied": "Оқылды деп белгілеу",
  "material.emptyTitle": "Әзірге материал жоқ",
  "material.emptyTeacher":
    "Алғашқы материалды қосыңыз: файл немесе сыртқы сілтеме.",
  "material.emptyStudent": "Мұғалім бұл топқа әлі материал қоспаған.",
  "material.deleteConfirm": "Материалды жою керек пе? Бұл қайтымсыз.",

  // Задачи
  "task.library": "Тапсырмалар кітапханасы",
  "task.libraryDesc":
    "Сіздің басқа топтарыңыздағы тапсырмалар. «Қосу» осы топта тәуелсіз көшірме жасайды.",
  "task.libraryEmpty": "Басқа топтарыңызда әзірге тапсырма жоқ.",
  "task.create": "+ Тапсырма құру",
  "task.condition": "Шарт не сұрақ",
  "task.options": "Жауап нұсқалары",
  "task.optionsPlaceholder": "Әр нұсқа жаңа жолдан",
  "task.correctAnswer": "Дұрыс жауап",
  "task.correctAnswerPlaceholder":
    "Нұсқалар үшін — нақты мәтін; бірнеше жауап «;» арқылы",
  "task.maxScore": "Максималды балл",
  "task.mapImage": "Тапсырма картасы",
  "task.image": "Шартқа сурет",
  "task.imageHintPrefix": "JPG, PNG немесе WebP, дейін",
  "task.emptyTitle": "Әзірге тапсырма жоқ",
  "task.emptyTeacher":
    "Алғашқы тапсырманы құрыңыз — оқушылар оны осы бөлімде көреді.",
  "task.emptyStudent": "Мұғалім бұл топқа әлі тапсырма қоспаған.",
  "task.groupDeleteConfirm":
    "Топты барлық тапсырмалармен, материалдармен және оқушы шешімдерімен бірге жою керек пе? Бұл қайтымсыз.",

  // Подборки
  "set.create": "+ Жинақ құру",
  "set.titlePlaceholder": "Мысалы: Климат — 20 тапсырма",
  "set.descPlaceholder": "Қай тақырып және не үшін шешу",
  "set.trainingMinutes": "Олимпиадаға уақыт, минут",
  "set.mode": "Оқушылар қалай жұмыс істейді",
  "set.modeCollection": "Жаттығу",
  "set.modeOlympiad": "Уақытпен олимпиада",
  "set.modeCollectionHint":
    "Оқушылар өз қарқынымен шешіп, жауаптарын түзете алады.",
  "set.modeOlympiadHint":
    "Таймері бар бір талпыныс. Сұрақтар басталған соң ашылады, жауаптар автоматты сақталады.",
  "set.createButton": "Жинақ құру",
  "set.trainingBadge": "Олимпиада",
  "set.minShort": "мин",
  "set.tasksBadge": "Тапсырма",
  "set.emptyTitle": "Әзірге жинақ жоқ",
  "set.emptyTeacher":
    "Тақырыптық тапсырмалар жинағын құрыңыз — оқушылар оны ретімен шешеді.",
  "set.emptyStudent": "Мұғалім әлі тапсырма жинақтарын жасамаған.",

  // Решения (учитель)
  "sub.emptyTitle": "Әзірге шешім жоқ",
  "sub.emptyDesc":
    "Мұнда оқушылардың топ тапсырмаларына жауаптары пайда болады.",
  "sub.aria": "Тексеру режимі",
  "sub.all": "Барлығы",
  "sub.pending": "Тексерілуде",
  "sub.scoreOfPrefix": "Балл, барынша",
  "sub.feedback": "Пікір",
  "sub.saveReview": "Тексеруді сақтау",
  "sub.autoCheck": "Автотексеру",
  "sub.downloadFile": "Файлды жүктеу",
  "sub.editManual": "Бағаны қолмен өзгерту",
  "queue.allDone": "Барлығы тексерілді",
  "queue.allDoneDesc": "Тексерілмеген шешім қалмады — тамаша жұмыс!",
  "queue.end": "Кезек соңы",
  "queue.endDescPrefix": "Тек өткізіп жіберілген шешімдер қалды",
  "queue.endDescSuffix": "Оларға оралу үшін қайта бастаңыз.",
  "queue.restart": "Қайта бастау",
  "queue.remaining": "Кезекте қалды",
  "queue.saveNext": "Сақтап, келесіге",
  "queue.skip": "Өткізіп жіберу",

  // Участники
  "member.emptyTitle": "Әзірге қатысушы жоқ",
  "member.emptyTeacher": "Оқушыларға топтың шақыру кодын жіберіңіз.",
  "member.export": "Нәтижелерді CSV-ге экспорттау",
  "member.student": "Оқушы",
  "member.reviewed": "Тексерілген тапсырма",
  "member.totalScore": "Балл сомасы",
  "member.actions": "Әрекеттер",
  "member.remove": "Топтан шығару",
  "member.removeConfirm": "Оқушыны шешімдерімен бірге топтан шығару керек пе?",

  // Статусы задачи у ученика (бейдж)
  "taskStatus.solved": "Шешілді",
  "taskStatus.pending": "Тексерілуде",
  "taskStatus.partial": "Ішінара шешілді",
  "taskStatus.wrong": "Қате",
  "taskStatus.notSubmitted": "Жіберілмеген",

  // Копирование
  "copy.toGroup": "Топқа көшіру",
  "copy.thisGroup": "осы топ",
  "copy.button": "Көшіру",

  // Форма задачи (селекты)
  "taskForm.typeLabel": "Тапсырма түрі",

  // Карточка задачи
  "taskCard.newResult": "Жаңа нәтиже",
  "taskCard.onlyTraining": "Тек жаттығуда",
  "taskCard.maxScore": "Макс. балл",
  "taskCard.correctZone": "Дұрыс аймақ (тек сізге көрінеді):",
  "taskCard.correctAnswer": "Дұрыс жауап",
  "taskCard.editTask": "Тапсырманы өңдеу",
  "taskCard.newImage": "Шартқа жаңа сурет",
  "taskCard.deleteTask": "Тапсырманы жою",
  "taskCard.deleteTaskConfirm":
    "Тапсырманы оқушы шешімдерімен бірге жою керек пе? Бұл қайтымсыз.",
  "stats.submitted": "Тапсырды",
  "stats.avgScore": "Орташа балл",
  "stats.of": "/",

  // Разбор решения
  "explanation.summary": "Шешім талдауы",
  "explanation.added": "қосылған",
  "explanation.hint": "Оқушы талдауды шешімі тексерілгеннен кейін көреді.",
  "explanation.text": "Талдау мәтіні",
  "explanation.textPlaceholder":
    "Шешу барысы, жиі кездесетін қателер, неге назар аудару керек",
  "explanation.replaceFile": "Талдау файлын ауыстыру",
  "explanation.file": "Талдау файлы (міндетті емес)",
  "explanation.fileHintPrefix": "PDF, JPG, PNG немесе WebP, дейін",
  "explanation.currentFile": "Ағымдағы файл",
  "explanation.openShort": "ашу",
  "explanation.save": "Талдауды сақтау",
  "explanation.delete": "Талдауды жою",
  "explanation.deleteConfirm": "Тапсырма талдауын жою керек пе?",

  // Блок решения ученика
  "student.yourAnswer": "Сіздің жауабыңыз",
  "student.mapHintYour": "Қызыл белгі — сіздің жауабыңыз",
  "student.mapHintCorrect": ", жасыл аймақ — дұрыс аумақ",
  "student.score": "Балл",
  "student.none": "жоқ",
  "student.comment": "Пікір",
  "student.notChecked": "Мұғалім шешімді әлі тексермеген.",
  "student.explanationTitle": "Тапсырма талдауы",
  "student.openExplanation": "Талдау файлын ашу",
  "student.oneShot":
    "Жинақта тапсырма бір рет шешіледі — жауап жіберілді және өзгермейді.",
  "student.resubmit": "Жауапты өзгертіп, қайта жіберу",
  "student.cantResubmit": "Тапсыру мерзімі өтті — жауапты өзгерту мүмкін емес.",

  // Форма отправки решения
  "answerForm.answer": "Жауап",
  "answerForm.image": "Сурет",
  "answerForm.file": "Файл",
  "answerForm.fileComment": "Файлға пікір",
  "answerForm.hint":
    "Жауап тек «Жіберу» батырмасын басқаннан кейін есептеледі. Әр тапсырманы бөлек жіберу керек.",
  "answerForm.submit": "Жіберу",
  "answerForm.fileHintImg": "JPG, PNG немесе WebP, дейін",
  "answerForm.fileHintAny": "Дейін",

  // Жетістіктер
  "ach.toDashboard": "Жеке кабинетке",
  "ach.earnedPrefix": "Алынған белгілер:",
  "ach.solvedTasks": "Шешілген тапсырмалар:",
  "ach.solvedMaps": "Карта тапсырмалары:",
  "ach.streak": "Серпін:",
  "ach.days": "күн",
  "ach.congrats": "Құттықтаймыз!",
  "ach.newBadgesPre": "Жаңа белгілер:",
  "ach.newBadgesPost": "Олар төменде белгіленген.",
  "ach.teacherEmptyTitle": "Белгілер — оқушыларға арналған",
  "ach.teacherEmptyDesc":
    "Жетістіктер шешілген тапсырмалар, карта тапсырмалары және серпін үшін беріледі.",
  "ach.new": "Жаңа",
  "ach.received": "Алынды",
  "ach.receivedAtPre": "Алынды:",
  // Белгілер топтары
  "badgeFamily.tasks": "Шешілген тапсырмалар",
  "badgeFamily.maps": "Карта тапсырмалары",
  "badgeFamily.streak": "Қатарынан күндер",
  // Белгілер каталогы
  "badge.task-1.title": "Алғашқы шешім",
  "badge.task-1.desc": "Алғашқы тапсырманы шешу",
  "badge.task-10.title": "Ондық",
  "badge.task-10.desc": "10 тапсырма шешу",
  "badge.task-50.title": "Елулік",
  "badge.task-50.desc": "50 тапсырма шешу",
  "badge.task-100.title": "Жүздік",
  "badge.task-100.desc": "100 тапсырма шешу",
  "badge.map-1.title": "Алғашқы карта",
  "badge.map-1.desc": "Картадағы нысанды дұрыс белгілеу",
  "badge.map-10.title": "Картограф",
  "badge.map-10.desc": "10 карта тапсырмасын шешу",
  "badge.map-25.title": "Карталар жеңімпазы",
  "badge.map-25.desc": "25 карта тапсырмасын шешу",
  "badge.streak-3.title": "Қатарынан үш күн",
  "badge.streak-3.desc": "Қатарынан 3 күн шұғылдану",
  "badge.streak-7.title": "Қатарынан апта",
  "badge.streak-7.desc": "Қатарынан 7 күн шұғылдану",
  "badge.streak-30.title": "Қатарынан ай",
  "badge.streak-30.desc": "Қатарынан 30 күн шұғылдану",

  // Жинақ беті
  "setChip.taskPrefix": "Тапсырма",
  "setChip.solved": "шешілді",
  "setChip.wrong": "қате",
  "setChip.pending": "тексеруде",
  "setChip.none": "шешілмеді",
  "setPage.backToSets": "Топ сабақтарына",
  "setPage.tasksCount": "Тапсырма:",
  "setPage.trainingBadgePre": "Олимпиада ·",
  "setPage.orderHint":
    "Еркін жаттығу: кез келген тапсырманы таңдап, жауаптарды түзетіп, қайта шешіңіз.",
  "setPage.deleteSet": "Жинақты жою",
  "setPage.deleteSetConfirm":
    "Жинақты жою керек пе? Тапсырмалар топта қалады, бірақ жинақ нәтижелері жоғалады.",
  "setPage.editTitleDesc": "Атауы мен сипаттамасын өңдеу",
  "setPage.addTaskFromGroup": "Топтан тапсырма қосу",
  "setPage.addToSet": "Жинаққа қосу",
  "setPage.reviewTitle": "Жауаптарды тексеру",
  "setPage.reviewHint":
    "Нұсқалы тапсырмалар мен карта тапсырмалары автоматты бағаланады. Мәтіндік жауаптарды қолмен бағалау керек.",
  "setPage.awaitingReview": "Тексеруді күтуде",
  "setPage.autoChecked": "Автотексеру",
  "setPage.noAnswers": "Оқушы бірде-бір жауап бермеді.",
  "setPage.attemptsTitle": "Оқушылардың әрекеттері",
  "setPage.thResult": "Нәтиже",
  "setPage.thStatus": "Күйі",
  "setPage.thStarted": "Басталды",
  "setPage.attemptFinished": "Аяқталды",
  "setPage.attemptOngoing": "Жүруде",
  "setPage.progressTitle": "Оқушылардың үлгерімі",
  "setPage.legend":
    "✓ шешілді · ◐ ішінара · ⏳ тексеруде · ✗ қате · — шешілмеді",
  "setPage.solvedOf": "Шешілді",
  "setPage.trainingTitle": "Сынақ олимпиадасы",
  "setPage.tasksWord": "тапсырма",
  "setPage.minutesWord": "минут",
  "setPage.oneAttemptNoHints": "бір әрекет · нұсқаусыз",
  "setPage.trainingStartHint":
    "Тапсырмалар басталғаннан кейін ашылады, таймер бірден іске қосылады — алдын ала дайындалыңыз.",
  "setPage.viewResult": "Нәтижені көру",
  "setPage.continueTraining": "Талпынысты жалғастыру",
  "setPage.startTraining": "Олимпиаданы бастау",
  "setPage.noTrainingTasks": "Мұғалім әлі жаттығуға тапсырма қоспаған.",
  "setPage.emptyTitle": "Жинақта әзірге тапсырма жоқ",
  "setPage.emptyTeacher": "Топ тапсырмаларын жоғарыдағы форма арқылы қосыңыз.",
  "setPage.emptyStudent": "Мұғалім бұл жинаққа әлі тапсырма қоспаған.",
  "setPage.taskWord": "Сұрақ",
  "setPage.removeFromSet": "Жинақтан алып тастау",

  // Жаттығу беті
  "training.backToSet": "Сабаққа",
  "training.answeredPre": "Жауап берілді:",
  "training.finish": "Аяқтау",
  "training.warning":
    "Әр жауапты бөлек сақтаңыз — тапсырманың астындағы «Жауапты сақтау» батырмасымен. Сақталмаған жауаптар аяқтау кезінде есептелмейді. Жауапты жаттығу соңына дейін өзгертуге болады.",
  "training.saved": "Сақталды",
  "training.maxScorePre": "Макс. балл:",
  "training.updateAnswer": "Жауапты жаңарту",
  "training.saveAnswer": "Жауапты сақтау",
  "training.finishTraining": "Жаттығуды аяқтау",
  "training.finished": "Олимпиада аяқталды",
  "training.autoScoreSuffix": "жиналған балл",
  "training.timeWord": "уақыты:",
  "training.correctPre": "Дұрыс ·",
  "training.wrongPre": "Қате · 0",
  "training.noAnswerPre": "Жауапсыз · 0",
  "training.noAutoCheck": "Мұғалім тексеруінде",
  "training.mapHint":
    "Қызыл белгі — сіздің жауабыңыз, жасыл аймақ — дұрыс аумақ.",
  "training.yourAnswerPre": "Сіздің жауабыңыз:",
  "training.correctAnswerPre": "Дұрыс жауап:",
  "training.manualNote":
    "Мәтіндік жауаптарды мұғалім тексереді. Жалпы балл тексерілгеннен кейін жаңартылады.",

  // Карта тапсырмасы (клиенттік MapPoint компоненті)
  "map.editorTitle": "Карта тапсырмасының мақсаты",
  "map.editorHint":
    "«Картаны басу» түрі үшін: картаны сурет өрісіне жүктеңіз, содан кейін дұрыс нүктені белгілеу үшін оны басып, рұқсатты таңдаңыз.",
  "map.alt": "Тапсырма картасы",
  "map.placeholder": "Сурет таңдалғаннан кейін карта осында пайда болады.",
  "map.tolerancePre": "Рұқсат (аймақ радиусы):",
  "map.toleranceSuffix": "карта енінен",
  "map.clickToAnswer": "Жауапты белгілеу үшін картаны басыңыз",
  "map.clickToMove": " (жаңа басумен жылжытуға болады)",

  // Серверлік қате хабарлары (API-роуттардағы валидация)
  "err.emailTaken": "Мұндай email бар пайдаланушы тіркелген.",
  "err.invalidTeacherCode":
    "Мұғалім коды қате. Кодты платформа әкімшісінен алыңыз.",
  "err.invalidCredentials": "Email немесе құпия сөз қате.",
  "err.fillAllFields": "Барлық өрісті толтырыңыз.",
  "err.enterEmail": "Email енгізіңіз.",
  "err.enterValidEmail": "Дұрыс email енгізіңіз.",
  "err.enterInviteCode": "Шақыру кодын енгізіңіз.",
  "err.groupCodeNotFound": "Мұндай коды бар топ табылмады.",
  "err.linkInvalid": "Сілтеме жарамсыз немесе ескірген.",
  "err.linkInvalidRequestNew":
    "Сілтеме жарамсыз немесе ескірген. Жаңасын сұраңыз.",
  "err.groupFields": "Топтың атауы мен сипаттамасын толтырыңыз.",
  "err.materialFields":
    "Материалдың атауын, сипаттамасын және түрін толтырыңыз.",
  "err.materialFile": "Таңдалған түр үшін файл жүктеңіз.",
  "err.materialFileType": "Файл таңдалған материал түріне сәйкес келмейді.",
  "err.addValidLink": "Дұрыс сілтеме қосыңыз (http:// немесе https://).",
  "err.taskFields":
    "Атауын, шартын, түрін және максимал баллды (0-ден жоғары) толтырыңыз.",
  "err.taskOptions":
    "Кемінде екі әртүрлі нұсқаны көрсетіңіз. Нұсқаның ішінде «;» белгісін қолданбаңыз.",
  "err.correctRequired":
    "Нұсқалы тапсырма үшін дұрыс жауапты көрсетіңіз — автотексеру сол бойынша жұмыс істейді.",
  "err.correctMismatchPre":
    "Дұрыс жауап нұсқалармен дәлме-дәл сәйкес келуі керек. Тізімде жоқ:",
  "err.imageFormat": "Сурет JPG, PNG немесе WebP форматында болуы керек.",
  "err.mapImage": "Карта тапсырмасы үшін карта суретін жүктеңіз.",
  "err.mapPointTeacher": "Картада дұрыс нүктені белгілеп, рұқсатты орнатыңыз.",
  "err.mapPointStudent": "Картада нүктені белгілеңіз.",
  "err.mapCoords": "Карта тапсырмасы мақсатының координаттары қате.",
  "err.setFields": "Сабақ атауын енгізіңіз (200 таңбаға дейін).",
  "err.trainingLimit":
    "Жаттығу лимиті — 1-ден 600-ге дейінгі бүтін минут саны.",
  "err.taskNotFound": "Тапсырма табылмады.",
  "err.taskNotInGroup": "Тапсырма бұл топтан табылмады.",
  "err.taskNotInTraining": "Тапсырма жаттығудан табылмады.",
  "err.selectGroup": "Көшіру үшін топты таңдаңыз.",
  "err.copyGroupNotFound": "Көшіру тобы табылмады.",
  "err.selectAnswerOption": "Тізімнен жауап нұсқасын таңдаңыз.",
  "err.selectTask": "Тапсырманы таңдаңыз.",
  "err.taskAlreadyInSet": "Бұл тапсырма жинақта бар.",
  "err.taskOnlyTraining": "Бұл тапсырма тек жаттығу режимінде шешіледі.",
  "err.trainingNotConfigured": "Бұл жинаққа жаттығу бапталмаған.",
  "err.trainingFinished": "Жаттығу аяқталды.",
  "err.trainingTimeUp": "Уақыт бітті — жаттығу аяқталды.",
  "err.trainingNoTasks": "Жинақта әзірге жаттығуға арналған тапсырма жоқ.",
  "err.explanationFile": "Талдау файлы — PDF, JPG, PNG немесе WebP.",
  "err.explanationContent": "Талдау мәтінін немесе файл қосыңыз.",
  "err.answerContent": "Жауап немесе файл қосыңыз.",
  "err.enterAnswer": "Жауап енгізіңіз.",
  "err.materialFileMissing":
    "Материал файлы дискіден табылмады — көшіру тоқтатылды.",
  "err.imageFileMissing":
    "Тапсырма суреті дискіден табылмады — көшіру тоқтатылды.",
  // Мән қойылатын қателер (label/күн/сан роутта қойылады)
  "err.storagePre": "Қойма лимитіне жетті",
  "err.storageDeletePost": ". Қажетсіз файлдарды жойыңыз.",
  "err.storageTeacherPost": ". Мұғалімге хабарласыңыз.",
  "err.fileTooBig": "Файл тым үлкен. Ең көбі —",
  "err.imageTooBig": "Сурет тым үлкен. Ең көбі —",
  "err.pwdLenPre": "Құпия сөз",
  "err.pwdLenPost": " таңбадан қысқа болмауы керек.",
  "err.scoreRangePre": "Балл — 0-ден",
  "err.scoreRangePost": "-ге дейін, 0,5 қадамымен болуы керек.",
  "err.rateLimitLoginPre":
    "Кіру әрекеті тым көп. Мына уақыттан кейін қайталаңыз:",
  "err.rateLimitVerifyPre":
    "Кодты енгізу әрекеті тым көп. Мына уақыттан кейін қайталаңыз:",
  "err.rateLimitResendPre":
    "Код тым жиі сұралды. Мына уақыттан кейін қайталаңыз:",
  "err.enterCode": "Хаттағы кодты енгізіңіз.",
  "err.codeWrong": "Код қате. Хатты тексеріп, қайта көріңіз.",
  "err.codeExpired": "Кодтың мерзімі өтті. Жаңасын сұратыңыз.",
  "err.codeTooManyAttempts": "Қате әрекет тым көп. Жаңа код сұратыңыз.",
  "err.rateLimitForgotPre": "Сұраныс тым көп. Мына уақыттан кейін қайталаңыз:",
  "err.rateLimitPost": " минут.",
  "err.oneShotResubmit":
    "Жинақта тапсырма бір рет шешіледі — қайта жіберу мүмкін емес.",

  // Сәтті әрекеттер (?ok= баннері)
  "ok.passwordChanged": "Құпия сөз өзгертілді. Жаңа құпия сөзбен кіріңіз.",
  "ok.forgotSent":
    "Егер осы email-мен аккаунт болса, біз құпия сөзді қалпына келтіру сілтемесі бар хат жібердік.",
  "ok.codeResent": "Егер аккаунт әлі расталмаған болса, біз жаңа код жібердік.",
  "verify.title": "Поштаны растаңыз",
  "verify.subtitlePre": "Біз кодты мына мекенжайға жібердік:",
  "verify.codeLabel": "Хаттағы код",
  "verify.ttlPre": "Код",
  "verify.ttlPost": "минут жарамды.",
  "verify.submit": "Растау",
  "verify.resend": "Кодты қайта жіберу",
  "verify.spamHint": "Хат келмеді ме? «Спам» қалтасын тексеріңіз.",
  "ok.groupCreated": "Топ құрылды. Оқушыларға шақыру кодын жіберіңіз.",
  "ok.materialAdded": "Материал қосылды.",
  "ok.materialDeleted": "Материал жойылды.",
  "ok.setCreated": "Сабақ жобасы жасалды. Сұрақтар мен материалдар қосыңыз.",
  "ok.setDeleted": "Сабақ жойылды.",
  "ok.taskCreated": "Тапсырма құрылды.",
  "ok.taskDeleted": "Тапсырма жойылды.",
  "ok.reviewSaved": "Баға сақталды.",
  "ok.answerSubmitted": "Жауап жіберілді.",

  // Автотексеру (мәтін шешімде сақталады және оқушыға көрсетіледі)
  "feedback.autoCorrect": "Автотексеру: жауап дұрыс.",
  "feedback.autoWrong": "Автотексеру: жауап қате.",
  "feedback.autoPartialPre": "Автотексеру: дұрыс нұсқалар",
  "feedback.autoPartialExtra": "артығы —",

  // Құпия сөзді қалпына келтіру хаты
  "email.verifySubject": "Растау коды — Olympic Meridian",
  "email.verifyHeading": "Поштаны растау",
  "email.verifyIntro": "Тіркелуді аяқтау үшін сайтта осы кодты енгізіңіз:",
  "email.verifyTtlPre": "Код",
  "email.verifyTtlPost":
    "минут жарамды. Егер сіз тіркелмеген болсаңыз, хатты елемеңіз.",
  "email.resetSubject": "Құпия сөзді қалпына келтіру — Olympic Meridian",
  "email.resetHeading": "Құпия сөзді қалпына келтіру",
  "email.resetIntro":
    "Сіз Olympic Meridian-де құпия сөзді қалпына келтіруді сұрадыңыз. Жаңа құпия сөз орнату үшін төмендегі батырманы басыңыз:",
  "email.resetButton": "Құпия сөзді қалпына келтіру",
  "email.resetTtlPre": "Сілтеме",
  "email.resetTtlPost":
    "минут бойы жарамды. Егер сіз қалпына келтіруді сұрамаған болсаңыз — бұл хатты елемеңіз.",

  // Құпиялылық саясаты
  "privacy.link": "Құпиялылық саясаты",
  "privacy.title": "Құпиялылық саясаты",
  "privacy.back": "Басты бетке",
  "privacy.updatedPre": "Жаңартылды:",
  "register.consentPre": "Аккаунт жасау арқылы сіз",
  "register.consentLink": "құпиялылық саясатымен",

  // Рабочее пространство и сохранение ответов
  "ui.navigation": "Сабақ тапсырмалары",
  "ui.previous": "Артқа",
  "ui.next": "Келесі",
  "ui.solvedShort": "шешілді",
  "ui.draft": "Жоба осы құрылғыда сақталды. Тексеру үшін жауапты жіберіңіз.",
  "ui.saving": "Сақталуда…",
  "ui.saved": "Барлық жауап сақталды",
  "ui.saveError":
    "Сақтау мүмкін болмады. Жауаптар құрылғыда қалды; байланысты тексеріп, қайталаңыз.",
  "ui.retry": "Қайталау",
  "ui.sending": "Жіберілуде…",
  "ui.fileHint": "10 МБ дейін. Файл жауаппен бірге жіберіледі.",
  "ui.storageError":
    "Браузер жобаны құрылғыда сақтай алмайды. Шықпас бұрын жауапты жіберіңіз.",
  "ui.addOption": "Нұсқа қосу",
  "ui.removeOption": "Нұсқаны алып тастау",
  "ui.selectCorrect": "Нұсқаның жанындағы дұрыс жауапты белгілеңіз.",
  "ui.continue": "Оқуды жалғастыру",
  "ui.joinCompact": "Басқа топқа қосылу",
  "ui.studentSubtitle": "Сабақтарыңыз бен нәтижелеріңіз бір жерде.",
  "ui.teacherSubtitle": "Топтар, тапсырмалар және жұмыстарды тексеру.",
  "ui.createTaskInSet": "Жинаққа тапсырма жасау",
  "ui.selectAll": "Барлығын таңдау / алып тастау",
  "ui.selected": "Таңдалды",
  "ui.order": "Тапсырмалар реті",
  "ui.up": "Жоғары",
  "ui.down": "Төмен",
  "ui.saveOrder": "Ретін сақтау",
  "ui.search": "Атауы бойынша тапсырма іздеу",
  "ui.finishConfirm":
    "Талпынысты аяқтау керек пе? Аяқталғаннан кейін жауаптарды өзгерту мүмкін емес.",
  "ui.cancel": "Шешуді жалғастыру",
  "ui.lockedSet":
    "Олимпиада басталды: тапсырмалар құрамы мен шарттары бекітілді. Жаңа нұсқа үшін басқа жинақ жасаңыз.",
  "ui.genericError": "Өзгерістерді сақтау мүмкін болмады. Қайталаңыз.",
  "ui.practiceHint":
    "Еркін жаттығу: жауаптарды өзгертіп, қайта шешуге болады. Жобалар автоматты түрде сақталады.",
  "ui.trainingHint":
    "Жауаптар автоматты түрде сақталады. Аяқталғанша өзгертуге болады. Бір талпыныс, уақыт шектеулі.",
  "ui.newResults": "Жаңа нәтижелер",
  "ui.openTasks": "Тапсырмаларды шешу",
  "ui.openSets": "Сабақтарды ашу",
  "ui.readOnly": "Тек қарау",
  "ui.changesSaved": "Өзгерістер сақталды.",
  "lesson.notFound": "Сабақ табылмады.",
  "lesson.emptyIssue": "Бермес бұрын кемінде бір сұрақ не материал қосыңыз.",
  "lesson.unsupportedTimed":
    "Олимпиадада мәтін, жауап нұсқалары не картадағы белгіні қолданыңыз. Файл жүктеуді жаттығуға қалдырыңыз.",
  "lesson.issuedSuccess": "Сабақ топқа берілді.",
  "lesson.chooseMaterials": "Осы топтың материалдарын таңдаңыз.",
};
