export const en = {
  // Language picker
  langPicker: {
    title: 'Choose your language',
    subtitle: 'You can change this later',
  },

  // Auth
  auth: {
    welcomeBack: 'Welcome back',
    createAccount: 'Create account',
    google: 'Google',
    apple: 'Apple',
    or: 'or',
    email: 'Email',
    phone: 'Phone',
    fullName: 'Full name',
    fullNamePlaceholder: 'Your full name',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    password: 'Password',
    passwordPlaceholder: 'Your password',
    passwordMinChars: 'Min 6 characters',
    signIn: 'Sign In',
    signUp: 'Create Account',
    pleaseWait: 'Please wait...',
    noAccount: "Don't have an account? ",
    hasAccount: 'Already have an account? ',
    signUpLink: 'Sign up',
    signInLink: 'Sign in',
    continueWithout: 'Continue without account',
    phoneNumber: 'Phone number',
    phonePlaceholder: '+389 70 123 456',
    phoneHint: 'Include country code (e.g. +389 for Macedonia)',
    sendCode: 'Send Verification Code',
    sending: 'Sending...',
    codeSentTo: 'Code sent to',
    verificationCode: 'Verification code',
    verifySignIn: 'Verify & Sign In',
    verifying: 'Verifying...',
    didntReceive: "Didn't receive it? ",
    resendCode: 'Resend code',
    checkEmail: 'Check your email',
    confirmationSent: 'We sent you a confirmation link. Please verify your email then sign in.',
    missingFields: 'Missing fields',
    enterEmailPassword: 'Please enter your email and password.',
    enterFullName: 'Please enter your full name.',
    invalidNumber: 'Invalid number',
    enterValidPhone: 'Please enter a valid phone number with country code (e.g. +38970123456)',
    invalidCode: 'Invalid code',
    enterSixDigit: 'Please enter the 6-digit code from your SMS',
    error: 'Error',
    tagline: 'Your personal travel advisor',
  },

  // Chat / Search
  chat: {
    greeting: 'Where to next?',
    greetingPersonal: 'Hey {{name}}, where to?',
    messagePlaceholder: 'Message Bea...',
    travelAdvisor: 'Travel advisor',
    introMessage: "Hi! I'm Bea, your personal travel advisor from Balkanea.\n\nI can help you:\n\n🏨  Find and book hotels worldwide\n🗣️  Chat with me in Macedonian or English\n🎯  Get personalized recommendations\n📞  Connect you with a live agent\n\nJust tell me where you want to go, or try asking:",
    introSample1: 'Find me a beach hotel in Santorini',
    introSample2: 'I have €1,000 and want to go to Italy',
    introSample3: 'What are the best hotels in Istanbul?',
    voiceError: 'Could not start voice call. Please check your connection.',
    voiceFailed: 'Voice call failed. Please try again.',
    voiceNotAvailable: 'Voice is not available on this device. Please try the web version.',
  },

  // Quick prompts
  prompts: {
    santorini: 'Santorini',
    turkey: 'Turkey',
    rome: 'Rome',
    helpChoose: 'Help me choose',
  },

  // Menu
  menu: {
    title: 'Menu',
    myBookings: 'My Bookings',
    exploreDestinations: 'Explore Destinations',
    signOut: 'Sign Out',
    cancel: 'Cancel',
  },

  // Actions
  actions: {
    callAgent: 'Call Agent',
    callback: 'Callback',
    callbackRequested: 'Callback Requested',
    callbackMessage: 'An agent will call you back shortly.',
    ok: 'OK',
  },

  // Explore
  explore: {
    title: 'Where to next?',
    subtitle: 'Popular destinations from the Balkans',
    noDestinations: 'No destinations found',
    tryDifferent: 'Try a different search or category',
    findHotels: 'Find hotels',
    searchPlaceholder: 'Search destinations...',
  },

  // Categories
  categories: {
    all: 'All',
    beach: 'Beach',
    mountain: 'Mountain',
    culture: 'Culture',
    adventure: 'Adventure',
    nightlife: 'Nightlife',
    nature: 'Nature',
    history: 'History',
    food: 'Food & Wine',
  },

  // Dashboard
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Your bookings',
    upcoming: 'Upcoming',
    past: 'Past',
    noBookings: 'No bookings yet',
    chatWithBea: 'Chat with Bea to find your perfect hotel',
    findHotel: 'Find a Hotel',
    cancelBooking: 'Cancel booking?',
    cancelConfirm: 'Cancel your reservation at "{{hotel}}"?',
    keep: 'Keep',
    cancelAction: 'Cancel Booking',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
    pending: 'Pending',
    nights: '{{count}} nights',
    night: '1 night',
  },

  // Hotel detail
  hotel: {
    amenities: 'Amenities',
    cancellationPolicy: 'Cancellation policy',
    selectRoom: 'Select a room',
    bookFor: 'Book for {{price}}',
    selectRoomFirst: 'Select a room',
    perNight: '/night',
    total: 'Total',
    maxGuests: 'Max {{count}} guests',
    notFound: 'Hotel not found',
    goBack: 'Go Back',
    kmFromCentre: '{{distance}} km from centre',
  },

  // Booking
  booking: {
    completeBooking: 'Complete your booking',
    bookingSummary: 'Booking summary',
    guestDetails: 'Guest details',
    fullName: 'Full name',
    emailAddress: 'Email address',
    phoneNumber: 'Phone number (optional)',
    payment: 'Payment',
    simulatedPayment: 'Payment simulation — no charge',
    confirmBooking: 'Confirm Booking',
    confirming: 'Confirming...',
    enterName: 'Please enter your full name.',
    enterEmail: 'Please enter a valid email address.',
    missingInfo: 'Missing information',
  },

  // Booking confirmed
  bookingConfirmed: {
    title: 'Booking Confirmed!',
    confirmationCode: 'Confirmation code',
    viewDashboard: 'View in Dashboard',
    bookAnother: 'Book Another',
  },

  // Locale selector
  locale: {
    language: 'Language',
    currency: 'Currency',
    settings: 'Settings',
  },

  // Common
  common: {
    nights: 'nights',
    night: 'night',
    perNight: '/night',
    from: 'from',
    close: 'Close',
    save: 'Save',
    error: 'Error',
    loading: 'Loading...',
  },
}

export type TranslationKeys = typeof en
