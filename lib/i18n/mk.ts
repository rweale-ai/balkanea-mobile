import type { TranslationKeys } from './en'

export const mk: TranslationKeys = {
  // Language picker
  langPicker: {
    title: 'Изберете јазик',
    subtitle: 'Можете да го промените подоцна',
  },

  // Auth
  auth: {
    welcomeBack: 'Добредојдовте назад',
    createAccount: 'Креирајте сметка',
    google: 'Google',
    apple: 'Apple',
    or: 'или',
    email: 'Е-пошта',
    phone: 'Телефон',
    fullName: 'Целосно име',
    fullNamePlaceholder: 'Вашето целосно име',
    emailLabel: 'Е-пошта',
    emailPlaceholder: 'you@example.com',
    password: 'Лозинка',
    passwordPlaceholder: 'Вашата лозинка',
    passwordMinChars: 'Минимум 6 знаци',
    signIn: 'Најавете се',
    signUp: 'Креирајте сметка',
    pleaseWait: 'Ве молиме почекајте...',
    noAccount: 'Немате сметка? ',
    hasAccount: 'Веќе имате сметка? ',
    signUpLink: 'Регистрирајте се',
    signInLink: 'Најавете се',
    continueWithout: 'Продолжете без сметка',
    phoneNumber: 'Телефонски број',
    phonePlaceholder: '+389 70 123 456',
    phoneHint: 'Вклучете го кодот на државата (пр. +389 за Македонија)',
    sendCode: 'Испрати код за верификација',
    sending: 'Се испраќа...',
    codeSentTo: 'Кодот е испратен на',
    verificationCode: 'Код за верификација',
    verifySignIn: 'Потврди и најави се',
    verifying: 'Се потврдува...',
    didntReceive: 'Не го добивте? ',
    resendCode: 'Испрати повторно',
    checkEmail: 'Проверете ја е-поштата',
    confirmationSent: 'Ви испративме линк за потврда. Потврдете ја вашата е-пошта и потоа најавете се.',
    missingFields: 'Недостасуваат полиња',
    enterEmailPassword: 'Внесете ја вашата е-пошта и лозинка.',
    enterFullName: 'Внесете го вашето целосно име.',
    invalidNumber: 'Невалиден број',
    enterValidPhone: 'Внесете валиден телефонски број со код на државата (пр. +38970123456)',
    invalidCode: 'Невалиден код',
    enterSixDigit: 'Внесете го 6-цифрениот код од SMS пораката',
    error: 'Грешка',
    tagline: 'Вашиот личен туристички советник',
  },

  // Chat / Search
  chat: {
    greeting: 'Каде следно?',
    greetingPersonal: 'Здраво {{name}}, каде одиш?',
    messagePlaceholder: 'Пишете на Беа...',
    travelAdvisor: 'Туристички советник',
    introMessage: "Здраво! Јас сум Беа, вашиот личен туристички советник од Балканеа.\n\nМожам да ви помогнам:\n\n🏨  Да најдете и резервирате хотели ширум светот\n🗣️  Разговарајте со мене на македонски или англиски\n🎯  Добијте персонализирани препораки\n📞  Поврзам ве со агент во живо\n\nКажете ми каде сакате да одите, или пробајте:",
    introSample1: 'Најди ми плажен хотел во Санторини',
    introSample2: 'Имам €1.000 и сакам да одам во Италија',
    introSample3: 'Кои се најдобрите хотели во Истанбул?',
    voiceError: 'Не може да се започне гласовен повик. Проверете ја вашата конекција.',
    voiceFailed: 'Гласовниот повик не успеа. Обидете се повторно.',
    voiceNotAvailable: 'Гласот не е достапен на овој уред. Обидете се на веб верзијата.',
  },

  // Quick prompts
  prompts: {
    santorini: 'Санторини',
    turkey: 'Турција',
    rome: 'Рим',
    helpChoose: 'Помогни ми да изберам',
  },

  // Menu
  menu: {
    title: 'Мени',
    myBookings: 'Мои резервации',
    exploreDestinations: 'Истражи дестинации',
    signOut: 'Одјави се',
    cancel: 'Откажи',
  },

  // Actions
  actions: {
    callAgent: 'Повикај агент',
    callback: 'Побарај повик',
    callbackRequested: 'Побарано е повикување',
    callbackMessage: 'Агент ќе ви се јави наскоро.',
    ok: 'OK',
  },

  // Explore
  explore: {
    title: 'Каде следно?',
    subtitle: 'Популарни дестинации од Балканот',
    noDestinations: 'Не се пронајдени дестинации',
    tryDifferent: 'Обидете се со друго пребарување или категорија',
    findHotels: 'Најди хотели',
    searchPlaceholder: 'Пребарувај дестинации...',
  },

  // Categories
  categories: {
    all: 'Сите',
    beach: 'Плажа',
    mountain: 'Планина',
    culture: 'Култура',
    adventure: 'Авантура',
    nightlife: 'Ноќен живот',
    nature: 'Природа',
    history: 'Историја',
    food: 'Храна и вино',
  },

  // Dashboard
  dashboard: {
    title: 'Контролна табла',
    subtitle: 'Вашите резервации',
    upcoming: 'Претстојни',
    past: 'Минати',
    noBookings: 'Нема резервации',
    chatWithBea: 'Разговарајте со Беа за да го најдете совршениот хотел',
    findHotel: 'Најди хотел',
    cancelBooking: 'Откажи резервација?',
    cancelConfirm: 'Откажете ја резервацијата во "{{hotel}}"?',
    keep: 'Задржи',
    cancelAction: 'Откажи резервација',
    confirmed: 'Потврдена',
    cancelled: 'Откажана',
    pending: 'Во тек',
    nights: '{{count}} ноќи',
    night: '1 ноќ',
  },

  // Hotel detail
  hotel: {
    amenities: 'Удобности',
    cancellationPolicy: 'Политика на откажување',
    selectRoom: 'Изберете соба',
    bookFor: 'Резервирај за {{price}}',
    selectRoomFirst: 'Изберете соба',
    perNight: '/ноќ',
    total: 'Вкупно',
    maxGuests: 'Макс. {{count}} гости',
    notFound: 'Хотелот не е пронајден',
    goBack: 'Назад',
    kmFromCentre: '{{distance}} км од центарот',
  },

  // Booking
  booking: {
    completeBooking: 'Завршете ја резервацијата',
    bookingSummary: 'Преглед на резервација',
    guestDetails: 'Податоци за гостинот',
    fullName: 'Целосно име',
    emailAddress: 'Е-пошта',
    phoneNumber: 'Телефонски број (опционално)',
    payment: 'Плаќање',
    simulatedPayment: 'Симулација на плаќање — без наплата',
    confirmBooking: 'Потврди резервација',
    confirming: 'Се потврдува...',
    enterName: 'Внесете го вашето целосно име.',
    enterEmail: 'Внесете валидна е-пошта.',
    missingInfo: 'Недостасуваат информации',
  },

  // Booking confirmed
  bookingConfirmed: {
    title: 'Резервацијата е потврдена!',
    confirmationCode: 'Код за потврда',
    viewDashboard: 'Погледни во контролна табла',
    bookAnother: 'Резервирај друга',
  },

  // Locale selector
  locale: {
    language: 'Јазик',
    currency: 'Валута',
    settings: 'Поставки',
  },

  // Common
  common: {
    nights: 'ноќи',
    night: 'ноќ',
    perNight: '/ноќ',
    from: 'од',
    close: 'Затвори',
    save: 'Зачувај',
    error: 'Грешка',
    loading: 'Се вчитува...',
  },
}
