export interface ScamGuide {
  slug: string;
  title: string;
  emoji: string;
  looksLike: string;
  whyItWorks: string;
  warningSigns: string[];
  whatToDo: string[];
  example: string;
}

export const SCAM_GUIDES: ScamGuide[] = [
  {
    slug: "kyc",
    title: "KYC update scams",
    emoji: "🪪",
    looksLike: "An SMS or call saying your bank KYC is incomplete and the account closes today.",
    whyItWorks: "It uses a real-sounding rule plus a same-day deadline, so people act before checking.",
    warningSigns: ["Same-day deadline", "Link to a lookalike site", "Asks for card, OTP or Aadhaar"],
    whatToDo: ["Open your bank's own app", "Call the number on your passbook", "Never share an OTP"],
    example: "Dear customer, your KYC is pending. Account will be blocked today. Update at sbi-kyc-verify.com",
  },
  {
    slug: "upi",
    title: "UPI refund scams",
    emoji: "📲",
    looksLike: "Someone says they will refund you and asks you to scan a QR or approve a 'collect' request.",
    whyItWorks: "People assume scanning receives money. It only ever sends money.",
    warningSigns: ["Asked to scan to 'receive'", "Pre-filled amount", "Caller stays on the line guiding you"],
    whatToDo: ["Refuse to scan anything", "End the call", "Check the payee name in your app"],
    example: "Sir, for your ₹4,999 refund please scan this QR and enter your UPI PIN.",
  },
  {
    slug: "lottery",
    title: "Lottery and prize scams",
    emoji: "🎁",
    looksLike: "A message says you have won a large prize and must pay a small processing fee.",
    whyItWorks: "The fee feels tiny compared to the prize, so it seems worth the risk.",
    warningSigns: ["You never entered", "Fee before prize", "Shortened claim link"],
    whatToDo: ["Delete the message", "Never pay a fee for winnings", "Report the number"],
    example: "Congratulations! You won ₹25,000. Pay ₹499 processing at bit.ly/claim-25k",
  },
  {
    slug: "delivery",
    title: "Courier and delivery scams",
    emoji: "📦",
    looksLike: "A parcel is 'held' and a small customs or redelivery fee is demanded by link.",
    whyItWorks: "Most of us are waiting for some parcel, so the story fits.",
    warningSigns: ["Fee by SMS link", "No order number", "Urgent 24-hour window"],
    whatToDo: ["Track in the courier's own app", "Never pay via an SMS link"],
    example: "Your parcel is at customs. Pay ₹49 at bit.ly/parcel-fee within 24 hours.",
  },
  {
    slug: "job",
    title: "Job offer scams",
    emoji: "💼",
    looksLike: "A WhatsApp message offers easy daily earnings for liking videos or simple tasks.",
    whyItWorks: "Small early payouts build trust before a big 'deposit' is requested.",
    warningSigns: ["Pay to start", "Telegram-only interviews", "Promised daily income"],
    whatToDo: ["Never pay to get a job", "Verify the company's official careers page"],
    example: "Part time work from home, earn ₹3,000/day. Join our Telegram group to start.",
  },
  {
    slug: "support",
    title: "Fake customer support",
    emoji: "🎧",
    looksLike: "You search for a helpline, call a fake number, and are asked to install a screen-sharing app.",
    whyItWorks: "You made the call, so it feels safe.",
    warningSigns: ["Asked to install an app", "Asked for a remote access code", "Small 'test' payment"],
    whatToDo: ["Only use numbers inside the official app", "Never install apps a caller names"],
    example: "Please install AnyDesk and share the 9-digit code so I can fix your refund.",
  },
  {
    slug: "government",
    title: "Government impersonation",
    emoji: "🏛️",
    looksLike: "A call claims to be from police, income tax or a courier-with-police case against you.",
    whyItWorks: "Fear of legal trouble stops clear thinking.",
    warningSigns: ["Threat of arrest", "Demand for secrecy", "Payment to 'clear' a case"],
    whatToDo: ["Hang up", "No department collects fines over a call", "Tell a family member"],
    example: "This is the cyber cell. A parcel in your name has drugs. Pay a verification amount now.",
  },
  {
    slug: "whatsapp",
    title: "WhatsApp takeover",
    emoji: "💬",
    looksLike: "A 'friend' asks for a code you just received, or a stranger asks for money in a relative's name.",
    whyItWorks: "The request comes from a familiar-looking contact.",
    warningSigns: ["Six-digit code request", "New number claiming to be family", "Only texts, never calls"],
    whatToDo: ["Call the person on their old number", "Never share a verification code"],
    example: "Mummy this is my new number, my phone broke. Please send ₹10,000 urgently.",
  },
  {
    slug: "investment",
    title: "Investment and trading scams",
    emoji: "📈",
    looksLike: "A group promises guaranteed returns with screenshots of profits.",
    whyItWorks: "Group members are all part of the act and create social proof.",
    warningSigns: ["Guaranteed returns", "Withdrawal 'tax'", "Only via an app link"],
    whatToDo: ["Check SEBI registration", "Withdraw a small amount before adding more"],
    example: "Join our VIP group — 20% returns daily, guaranteed. Only 5 seats left.",
  },
  {
    slug: "deepfake",
    title: "AI voice and deepfake scams",
    emoji: "🤖",
    looksLike: "A short call in a relative's voice asking urgently for money.",
    whyItWorks: "A cloned voice bypasses your instinct to verify.",
    warningSigns: ["Very short call", "Bad connection excuse", "Do not tell anyone"],
    whatToDo: ["Hang up and call back yourself", "Agree a family safe-word"],
    example: "It's me, I've had an accident, send money now and don't tell papa.",
  },
];

export interface Alert {
  title: string;
  level: "suspicious" | "high";
  description: string;
  stayingSafe: string;
}

export const ALERTS: Alert[] = [
  {
    title: "Fake KYC deadline messages",
    level: "high",
    description: "A wave of SMS claiming bank accounts close today unless KYC is updated by link.",
    stayingSafe: "Banks never send KYC links by SMS. Use the bank's own app.",
  },
  {
    title: "Courier customs fee texts",
    level: "high",
    description: "Small ₹19–₹99 fees demanded to release a 'held' parcel.",
    stayingSafe: "Track parcels only in the courier's official app.",
  },
  {
    title: "Electricity bill disconnection calls",
    level: "suspicious",
    description: "Calls threatening night-time disconnection unless you pay immediately.",
    stayingSafe: "Check your bill in the provider's official app or a paper bill.",
  },
  {
    title: "Part-time task job groups",
    level: "suspicious",
    description: "Task-based earning groups that later ask for a deposit.",
    stayingSafe: "Never pay money to receive work.",
  },
];

export interface QuizQuestion {
  scenario: string;
  message: string;
  question: string;
  options: string[];
  correct: number;
  why: string;
}

export const QUIZ: QuizQuestion[] = [
  {
    scenario: "You receive this SMS",
    message: "Dear customer, your KYC is incomplete. Account blocked today. Update: sbi-kyc-online.com",
    question: "What would you do?",
    options: [
      "Open the link and fill the form",
      "Reply with your account number",
      "Open your bank's official app and check",
      "Forward it to family and then open it",
    ],
    correct: 2,
    why: "Banks never send KYC links by SMS. Checking inside the official app is always safe.",
  },
  {
    scenario: "A caller says",
    message: "Sir, for your ₹4,999 refund please scan this QR code and enter your UPI PIN.",
    question: "What is happening here?",
    options: [
      "A normal refund process",
      "Scanning will send your money away",
      "You need to enter the PIN twice",
      "You should scan but not confirm",
    ],
    correct: 1,
    why: "A QR scan can only send money out. Refunds never need your UPI PIN.",
  },
  {
    scenario: "A WhatsApp message from an unknown number",
    message: "Mummy, my phone broke, this is my new number. Please send ₹10,000 urgently.",
    question: "Your safest first step?",
    options: [
      "Send the money, it's family",
      "Ask for a photo",
      "Call your child on their old number",
      "Send half now, half later",
    ],
    correct: 2,
    why: "Calling the number you already have confirms who you are really speaking to.",
  },
  {
    scenario: "You get this email",
    message: "From alerts@amazon-refund-dept.com — claim your ₹1,200 refund by confirming card details.",
    question: "What gives it away?",
    options: [
      "The amount is too small",
      "The sender domain is not the real company",
      "Refunds are never by email",
      "Nothing, it looks genuine",
    ],
    correct: 1,
    why: "Look at the part after the @ symbol. Copycat domains add words like 'refund-dept'.",
  },
  {
    scenario: "A call claims to be the cyber cell",
    message: "A parcel in your name contains drugs. Pay a verification amount to close the case.",
    question: "The right response?",
    options: [
      "Pay to avoid trouble",
      "Hang up and tell a family member",
      "Share your Aadhaar to prove innocence",
      "Ask them to call back tomorrow",
    ],
    correct: 1,
    why: "No police department asks for payment over a call. Fear is the whole tactic.",
  },
];

export interface OrgEntry {
  name: string;
  category: string;
  website: string;
  howToVerify: string;
}

export const ORGS: OrgEntry[] = [
  {
    name: "Your bank (demo entry)",
    category: "Bank",
    website: "Use the address printed on your passbook or card",
    howToVerify: "Open the bank's own app, or call the number on the back of your card.",
  },
  {
    name: "Courier company (demo entry)",
    category: "Courier",
    website: "Use the tracking page inside the courier's official app",
    howToVerify: "Compare the order number in your shopping app before paying anything.",
  },
  {
    name: "Payment app support (demo entry)",
    category: "Payments",
    website: "Support lives inside the payment app itself",
    howToVerify: "Never search for a helpline number — use Help inside the app.",
  },
  {
    name: "Government service (demo entry)",
    category: "Government",
    website: "Official portals end in .gov.in",
    howToVerify: "Type the address yourself; do not follow links from messages.",
  },
];

export const WEEKLY_CHECKS = [
  { day: "Mon", checks: 3, flagged: 1 },
  { day: "Tue", checks: 5, flagged: 2 },
  { day: "Wed", checks: 2, flagged: 0 },
  { day: "Thu", checks: 6, flagged: 3 },
  { day: "Fri", checks: 4, flagged: 1 },
  { day: "Sat", checks: 7, flagged: 2 },
  { day: "Sun", checks: 3, flagged: 1 },
];

export const CATEGORY_SPREAD = [
  { name: "KYC", value: 9 },
  { name: "Delivery", value: 7 },
  { name: "Lottery", value: 5 },
  { name: "Job", value: 4 },
  { name: "UPI", value: 6 },
];
