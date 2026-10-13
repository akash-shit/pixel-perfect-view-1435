import { redactSensitiveInput } from "./scamDetectionService.js";

const LANGUAGE_NAMES = {
  en: "English",
  hi: "Hindi",
  bn: "Bengali",
};

const DEFAULT_FALLBACKS = {
  en: "I’m having trouble connecting to my AI service right now, but I can still help with ScamShield’s available features. You can ask me about checking a suspicious message, trusted contacts, your check history, or scam safety.",
  hi: "मैं अभी अपने AI सेवा से कनेक्ट करने में समस्या महसूस कर रहा हूँ, लेकिन ScamShield की उपलब्ध सुविधाओं में अभी भी मदद कर सकता हूँ। आप मुझे संदिग्ध संदेश की जाँच, भरोसेमंद संपर्क, आपकी जाँच इतिहास, या स्कैम सुरक्षा के बारे में पूछ सकते हैं।",
  bn: "আমি এখনও আমার AI সেবার সাথে সংযোগ করতে পারছি না, কিন্তু ScamShield-এর উপলব্ধ ফিচার নিয়ে এখনও আপনাকে সাহায্য করতে পারি। আপনি আমাকে সন্দেহজনক বার্তা পরীক্ষা, বিশ্বস্ত পরিচিতি, পূর্বের যাচাই, বা স্ক্যাম নিরাপত্তা নিয়ে জিজ্ঞাসা করতে পারেন।",
};

const FALLBACK_ANSWERS = {
  en: {
    greeting:
      "Hi! I’m your ScamShield assistant. I can help you check suspicious messages, links, calls, emails, UPI requests, or explain how to use the app. What would you like help with?",
    about:
      "ScamShield helps you check suspicious messages, links, phone numbers, emails, UPI requests, and screenshots. It explains possible warning signs and suggests what to do next. A check is guidance, not proof that something is safe.",
    message:
      "Open Check, choose Message, and paste the message. ScamShield will explain any warning signs and suggest next steps. Don’t click links or share an OTP, password, or PIN while you check. Results are indicators, not proof that a message is safe.",
    upi: "Open Check and choose the UPI option, or paste the UPI ID or payment request into Check. Verify the recipient inside your official payment app before paying. Never enter your UPI PIN to receive money; a check cannot prove an ID is safe.",
    link: "Open Check and choose Link, then paste the address. Don’t open it just to test it. ScamShield can point out warning signs, but no check can prove a link is safe; verify through the organization’s official app or website.",
    phone:
      "Open Check and choose Phone Number, then enter the number. A report or warning is only an indicator, and no report does not prove a caller is genuine. Verify callers using an official number you find yourself.",
    phoneCheck:
      "To check whether a phone number looks suspicious, open Check and choose Phone Number, then enter the number. Review the warning signs and verify it using an official number you find yourself. A warning is only an indicator, not proof that the caller is genuine.",
    email:
      "Open Check and choose Email, then paste the message and sender details. Don’t open unexpected attachments or links. ScamShield looks for warning signs, but its result is not proof that an email is genuine.",
    screenshot:
      "Open Check and choose Screenshot to upload a picture of the suspicious message. Review the extracted text and warning signs. Avoid uploading images that show private information you don’t need checked.",
    history:
      "Open History in the app navigation to review your saved scam checks and their explanations.",
    insights:
      "Open Insights to review your checking activity, risk patterns, and weekly safety summary.",
    alerts:
      "Open Alerts to read about scam patterns reported as currently circulating. Treat alerts as awareness guidance and verify important claims independently.",
    learn:
      "Open Learn for short guides about common scams, warning signs, and safer next steps.",
    quiz: "Open Quiz to practise spotting scam warning signs with short examples.",
    family:
      "Open Family to add or manage trusted contacts. If something feels suspicious, ask someone you trust before paying or sharing information.",
    saveContact:
      "To save a family member or trusted contact, open Family, add their name, relationship, and phone number, and save it. This is separate from a scam check. A suspicious number can be checked in Check without saving it as a trusted contact.",
    unsupported:
      "ScamShield does not currently offer a direct assistant action to block or remove a phone number. Use the Family page to save trusted people, and use your phone’s built-in call/message blocking features if you need to stop unwanted calls.",
    emergency:
      "If you think you were scammed, stop replying and do not share any more OTP, password, PIN, or money. If money was lost in India, call 1930 as soon as possible and report it on cybercrime.gov.in. Keep the suspected number and any proof and tell a trusted person.",
    report:
      "Open Report to record a suspected scam for your own report flow. If money was taken in India, call 1930 promptly and report through cybercrime.gov.in.",
    settings:
      "Open Settings to change the app language, text size, contrast, motion, and voice preferences.",
    risk: "The risk score reflects warning signs found in the content; it is not a calibrated probability. A low score does not prove that something is safe. Verify through an official channel.",
  },
  hi: {
    greeting:
      "नमस्ते! मैं ScamShield सहायक हूँ। मैं संदिग्ध संदेश, लिंक, कॉल, ईमेल या UPI अनुरोध जाँचने और ऐप इस्तेमाल करने में मदद कर सकता हूँ। बताइए, आपको किस बात में मदद चाहिए?",
    about:
      "ScamShield संदिग्ध संदेश, लिंक, फ़ोन नंबर, ईमेल, UPI अनुरोध और स्क्रीनशॉट जाँचने में मदद करता है। यह चेतावनी के संकेत समझाता है और अगले कदम सुझाता है। जाँच केवल मार्गदर्शन है, किसी चीज़ के सुरक्षित होने का प्रमाण नहीं।",
    message:
      "जाँचें खोलें, संदेश चुनें और संदेश पेस्ट करें। ScamShield चेतावनी के संकेत और अगले कदम बताएगा। जाँच करते समय लिंक न खोलें और OTP, पासवर्ड या PIN साझा न करें। नतीजे संकेत हैं, संदेश के सुरक्षित होने का प्रमाण नहीं।",
    upi: "जाँचें खोलें और UPI विकल्प चुनें, या UPI ID/भुगतान अनुरोध वहाँ पेस्ट करें। भुगतान से पहले अपने आधिकारिक पेमेंट ऐप में पाने वाले की पुष्टि करें। पैसे पाने के लिए कभी UPI PIN न डालें; जाँच किसी ID के सुरक्षित होने का प्रमाण नहीं है।",
    link: "जाँचें खोलें, लिंक चुनें और पता पेस्ट करें। जाँचने के लिए लिंक न खोलें। ScamShield चेतावनी के संकेत बता सकता है, लेकिन सुरक्षित होने का प्रमाण नहीं; संस्था की आधिकारिक ऐप या वेबसाइट से पुष्टि करें।",
    phone:
      "जाँचें खोलें, फ़ोन नंबर चुनें और नंबर डालें। रिपोर्ट या चेतावनी केवल संकेत है; रिपोर्ट न होना कॉलर के असली होने का प्रमाण नहीं। खुद ढूँढे आधिकारिक नंबर से पुष्टि करें।",
    phoneCheck:
      "फ़ोन नंबर की संदिग्धता जाँचने के लिए Check खोलें, Phone Number चुनें, और नंबर डालें। चेतावनी के संकेत देखें और खुद के ढूँढे आधिकारिक नंबर से पुष्टि करें। चेतावनी संकेत है, कॉलर के असली होने का प्रमाण नहीं।",
    email:
      "जाँचें खोलें, ईमेल चुनें और संदेश व भेजने वाले की जानकारी पेस्ट करें। अनजान अटैचमेंट या लिंक न खोलें। जाँच चेतावनी के संकेत दिखाती है, ईमेल के असली होने का प्रमाण नहीं।",
    screenshot:
      "जाँचें खोलें और स्क्रीनशॉट चुनकर संदिग्ध संदेश की तस्वीर अपलोड करें। निकला हुआ पाठ और चेतावनी के संकेत देखें। निजी जानकारी वाली तस्वीरें अपलोड करने से बचें।",
    history:
      "सहेजी गई जाँच और उनके स्पष्टीकरण देखने के लिए ऐप के मेनू में इतिहास खोलें।",
    insights:
      "जाँच गतिविधि, जोखिम के रुझान और साप्ताहिक सुरक्षा सारांश देखने के लिए जानकारी खोलें।",
    alerts:
      "अभी चल रहे घोटालों के बारे में जानने के लिए चेतावनी खोलें। यह जानकारी केवल जागरूकता के लिए है; ज़रूरी बातों की अलग से पुष्टि करें।",
    learn:
      "आम घोटालों, चेतावनी के संकेतों और सुरक्षित कदमों के बारे में छोटी मार्गदर्शिकाएँ पढ़ने के लिए सीखें खोलें।",
    quiz: "छोटे उदाहरणों के साथ घोटाले के संकेत पहचानने का अभ्यास करने के लिए प्रश्नोत्तरी खोलें।",
    family:
      "विश्वस्त संपर्क जोड़ने या सँभालने के लिए परिवार खोलें। कुछ संदिग्ध लगे तो पैसे देने या जानकारी साझा करने से पहले किसी भरोसेमंद व्यक्ति से पूछें।",
    saveContact:
      "परिवार के सदस्य या विश्वस्त संपर्क को सहेजने के लिए Family खोलें, उनका नाम, रिश्ता और फ़ोन नंबर भरें और सेव करें। यह जाँच से अलग है। संदिग्ध नंबर को बिना सहेजे Check में जाँचा जा सकता है।",
    unsupported:
      "ScamShield में अभी सीधे किसी नंबर को ब्लॉक या हटाने की एआई सुविधा नहीं है। विश्वस्त संपर्क के लिए Family का उपयोग करें, और unwanted कॉल रोकने के लिए अपने फ़ोन की ब्लॉक सुविधा का उपयोग करें।",
    emergency:
      "अगर लगता है कि धोखाधड़ी हुई है, तो जवाब देना बंद करें और और OTP, पासवर्ड, PIN या पैसा न दें। भारत में पैसा खोया हो तो तुरंत 1930 पर कॉल करें और cybercrime.gov.in पर रिपोर्ट करें। संदिग्ध नंबर और सबूत सुरक्षित रखें।",
    report:
      "संदिग्ध घोटाले की जानकारी दर्ज करने के लिए रिपोर्ट खोलें। भारत में पैसे का नुकसान हुआ है तो तुरंत 1930 पर कॉल करें और cybercrime.gov.in पर रिपोर्ट करें।",
    settings:
      "ऐप की भाषा, पाठ का आकार, रंगों का अंतर, गति और आवाज़ बदलने के लिए सेटिंग्स खोलें।",
    risk: "जोखिम स्कोर सामग्री में मिले चेतावनी संकेत दिखाता है; यह धोखाधड़ी की पक्की संभावना नहीं। कम स्कोर सुरक्षित होने का प्रमाण नहीं। आधिकारिक माध्यम से पुष्टि करें।",
  },
  bn: {
    greeting:
      "নমস্কার! আমি ScamShield সহায়ক। সন্দেহজনক বার্তা, লিঙ্ক, কল, ইমেল বা UPI অনুরোধ পরীক্ষা করতে এবং অ্যাপ ব্যবহার করতে সাহায্য করতে পারি। কীভাবে সাহায্য করব?",
    about:
      "ScamShield সন্দেহজনক বার্তা, লিঙ্ক, ফোন নম্বর, ইমেল, UPI অনুরোধ এবং স্ক্রিনশট পরীক্ষা করতে সাহায্য করে। এটি সতর্কতার লক্ষণ ব্যাখ্যা করে এবং পরের পদক্ষেপ জানায়। পরীক্ষাটি শুধু নির্দেশনা, নিরাপদ হওয়ার প্রমাণ নয়।",
    message:
      "Check খুলে Message বেছে বার্তাটি পেস্ট করুন। ScamShield সতর্কতার লক্ষণ এবং পরের পদক্ষেপ জানাবে। পরীক্ষা করার সময় লিঙ্কে ক্লিক করবেন না বা OTP, পাসওয়ার্ড, PIN দেবেন না। ফলাফল সতর্কতার ইঙ্গিত, নিরাপদ হওয়ার প্রমাণ নয়।",
    upi: "Check খুলে UPI বিকল্প বেছে নিন, অথবা UPI ID/পেমেন্ট অনুরোধটি পেস্ট করুন। টাকা পাঠানোর আগে আপনার অফিসিয়াল পেমেন্ট অ্যাপে প্রাপকের পরিচয় যাচাই করুন। টাকা পেতে কখনও UPI PIN দেবেন না; পরীক্ষা কোনো ID নিরাপদ প্রমাণ করে না।",
    link: "Check খুলে Link বেছে ঠিকানাটি পেস্ট করুন। পরীক্ষা করার জন্য লিঙ্ক খুলবেন না। ScamShield সতর্কতার লক্ষণ জানাতে পারে, কিন্তু নিরাপদ হওয়ার প্রমাণ দিতে পারে না; প্রতিষ্ঠানের অফিসিয়াল অ্যাপ বা ওয়েবসাইটে যাচাই করুন।",
    phone:
      "Check খুলে Phone Number বেছে নম্বরটি লিখুন। রিপোর্ট বা সতর্কতা কেবল ইঙ্গিত; রিপোর্ট না থাকলেই কলটি আসল প্রমাণ হয় না। নিজে খুঁজে পাওয়া অফিসিয়াল নম্বরে যাচাই করুন।",
    phoneCheck:
      "ফোন নম্বর সন্দেহজনক কিনা বুঝতে Check খুলে Phone Number বেছে নম্বরটি লিখুন। সতর্কতার লক্ষণ দেখুন এবং নিজে খুঁজে পাওয়া অফিসিয়াল নম্বরে যাচাই করুন। সতর্কতা কেবল ইঙ্গিত, কলার আসল হওয়ার প্রমাণ নয়।",
    email:
      "Check খুলে Email বেছে বার্তা ও প্রেরকের তথ্য পেস্ট করুন। অচেনা সংযুক্তি বা লিঙ্ক খুলবেন না। পরীক্ষা সতর্কতার লক্ষণ দেখায়, ইমেলটি আসল প্রমাণ করে না।",
    screenshot:
      "Check খুলে Screenshot বেছে সন্দেহজনক বার্তার ছবি আপলোড করুন। বের করা লেখা ও সতর্কতার লক্ষণ দেখুন। অপ্রয়োজনীয় ব্যক্তিগত তথ্য থাকা ছবি আপলোড করবেন না।",
    history:
      "সংরক্ষিত পরীক্ষা ও ব্যাখ্যা দেখতে অ্যাপের মেনু থেকে History খুলুন।",
    insights:
      "আপনার পরীক্ষার কার্যকলাপ, ঝুঁকির ধরন এবং সাপ্তাহিক নিরাপত্তা সারাংশ দেখতে Insights খুলুন।",
    alerts:
      "এখন চলা প্রতারণার ধরন জানতে Alerts খুলুন। সতর্কতাকে সচেতনতার নির্দেশনা হিসেবে নিন, গুরুত্বপূর্ণ তথ্য নিজে যাচাই করুন।",
    learn:
      "সাধারণ প্রতারণা, সতর্কতার লক্ষণ এবং নিরাপদ পরবর্তী পদক্ষেপ জানতে Learn-এর ছোট নির্দেশিকা পড়ুন।",
    quiz: "ছোট উদাহরণে প্রতারণার লক্ষণ চেনার অনুশীলন করতে Quiz খুলুন।",
    family:
      "বিশ্বস্ত পরিচিতি যোগ বা পরিচালনা করতে Family খুলুন। সন্দেহ হলে টাকা দেওয়া বা তথ্য জানানোর আগে বিশ্বস্ত কাউকে জিজ্ঞাসা করুন।",
    saveContact:
      "পরিবারের সদস্য বা বিশ্বস্ত পরিচিতি সংরক্ষণ করতে Family খুলুন, তাদের নাম, সম্পর্ক এবং ফোন নম্বর লিখে Save করুন। এটি স্ক্যাম চেকের থেকে আলাদা। সন্দেহজনক নম্বরকে সংরক্ষণ না করেই Check-এ পরীক্ষা করা যায়।",
    unsupported:
      "ScamShield-এ এখন সরাসরি কোনো নম্বর ব্লক বা মুছে ফেলার এআই কার্যকলাপ নেই। বিশ্বস্ত পরিচিতি রাখার জন্য Family ব্যবহার করুন, আর অবাঞ্ছিত কল বন্ধ করতে আপনার ফোনের ব্লক বিকল্প ব্যবহার করুন।",
    emergency:
      "যদি মনে হয় প্রতারণা হয়েছে, কথা বলা বন্ধ করুন এবং আরও OTP, পাসওয়ার্ড, PIN বা টাকা দেবেন না। ভারতে টাকা হারিয়ে থাকলে দ্রুত ১৯৩০-এ কল করুন এবং cybercrime.gov.in-এ রিপোর্ট করুন। সন্দেহজনক নম্বর ও প্রমাণ রাখা জরুরি।",
    report:
      "সন্দেহজনক প্রতারণার তথ্য নথিভুক্ত করতে Report খুলুন। ভারতে টাকা হারালে দ্রুত ১৯৩০ নম্বরে কল করুন এবং cybercrime.gov.in-এ রিপোর্ট করুন।",
    settings:
      "অ্যাপের ভাষা, লেখার আকার, কনট্রাস্ট, অ্যানিমেশন এবং ভয়েস পছন্দ বদলাতে Settings খুলুন।",
    risk: "ঝুঁকির স্কোরে পাওয়া সতর্কতার লক্ষণ বোঝায়; এটি প্রতারণার নিশ্চিত সম্ভাবনা নয়। কম স্কোর নিরাপদ হওয়ার প্রমাণ নয়। অফিসিয়াল মাধ্যমে যাচাই করুন।",
  },
};

const SYSTEM_PROMPT = `You are the professional ScamShield digital safety assistant for India.
Answer the user clearly and briefly in the requested language: English, Hindi (हिन्दी), or Bengali (বাংলा). Use simple, evidence-based guidance and keep it suitable for first-time or elderly users.
Stay grounded in the actual ScamShield app: the implemented pages are Check, History, Insights, Alerts, Learn, Quiz, Family, Report, Settings, Emergency, and Dashboard. Only describe functionality that exists in this app. A check is an indicator, not proof that a message, link, phone number, email, or UPI ID is safe.
When a user asks to save a family member or trusted contact, explain that this belongs in the Family page and must be done through the app by the user after confirming the contact. Do not claim the assistant itself can directly add, update, delete, or block contacts unless the app API is explicitly available and the user has authorized the action.
If the user asks to block or remove a number, explain that this feature is not currently provided by the assistant and should be handled through the phone's security or blocking settings.
If the user may have lost money to financial cyber fraud in India, advise them to stop interacting with the suspected scammer, not share any more credentials, call 1930 promptly, and report at the official portal https://cybercrime.gov.in. Be calm and supportive.
Never request or encourage sharing OTPs, passwords, PINs, CVVs, banking details, or other secrets. Do not invent app features, contact APIs, or facts.
Return only a JSON object with one string property named "answer".`;

function getFallbackAnswer(question, language) {
  const safeLanguage = FALLBACK_ANSWERS[language] ? language : "en";
  const normalized = String(question ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[ -]+/g, " ")
    .replace(/[.!?,؛।?]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const fallback = FALLBACK_ANSWERS[safeLanguage];

  if (!normalized) {
    return DEFAULT_FALLBACKS[safeLanguage];
  }

  const matchesAny = (patterns) => patterns.some((pattern) => pattern.test(normalized));

  if (
    matchesAny([
      /^(hi|hello|hey|hii|hiya|good morning|good afternoon|good evening|how are you|how are u|how r u|what's up|sup|can you help(?: me)?|could you help(?: me)?|what can you help me with|help me|thanks|thank you|thank u|nice|oh nice|okay|alright|ok|namaste|namaskar|hallo|hola)(?:\s|$)/u,
      /(नमस्ते|नमस्कार|हेलो|हाय|कैसे हैं|कैसी हैं|कैसे हो|धन्यवाद|शुक्रिया|क्या आप मेरी मदद कर सकते हैं|मदद कीजिए|হ্যালো|নমস্কার|ধন্যবাদ|কেমন আছেন|কেমন আছো|আপনি কি আমাকে সাহায্য করতে পারেন|আমাকে সাহায্য করুন)(?:\s|$)/u,
      /(hello|hi|hey|thanks|thank you|nice|okay|alright|ok|good|great|amazing|appreciate it)(?:\s|$)/u,
    ])
  ) {
    return fallback.greeting;
  }

  if (
    matchesAny([
      /(?:what is scamshield|what does scamshield do|about scamshield|scamshield.*(what|is|does))/u,
      /(?:scamshield|স্ক্যামশিল্ড).{0,25}(?:क्या है|क्या करता|কী|কি|এটা কি|কী কাজ করে)/u,
    ])
  ) {
    return fallback.about;
  }

  if (
    matchesAny([
      /(check|verify|is this|is it|safe|scam).*?(message|msg|sms|text)|(?:message|msg|sms|text).*?(check|verify|safe|scam)|(?:how can i check|want to check).*?(message|msg|sms|text)|(?:suspicious|fake|fraud|bogus).*?(message|msg|sms|text)/u,
      /(संदिग्ध|संदेहजनक|फर्जी|झूठा|भ्रामक|ভুয়া|ভুল|scam).{0,30}(संदेश|मैसेज|बार्ता|মেসেজ|টেক্স्ट)|(?:संदेश|मैसेज|बार्ता|মেসেজ|টেক্স्ट).{0,30}(जांच|जाँच|चेक|যাচাই|পরীক্ষा|check|verify)|(?:कैसे|किस\s+तरह|कীভাবে|कিভাবে|এভাবে).{0,20}(संदेश|मैसेज|बार्ता|मেসेज|টেক্স्ट).{0,20}(जांच|जाँच|चेक|যাচাই|परिक्षा)/u,
      /(সন্দেহজনক|ভুয়া|ফেক|কেলেঙ্কারি|জাল|স্ক্যাম).{0,30}(বার্তা|মেসেজ|টেক্সট)|(?:বার্তা|মেসেজ|টেক্সট).{0,30}(চেক|যাচাই|পরীক্ষা|check|verify)/u,
    ])
  ) {
    return fallback.message;
  }

  if (
    matchesAny([
      /(check|verify|safe|scam).*?(upi|upi id|upi request|payment request|qr code|qr|transaction)|(?:upi|upi id|upi request|payment request|qr code|qr|transaction).*?(check|verify|safe|scam)|(?:how can i check|want to check).*?(upi|upi id|upi request|payment request)|(?:suspicious|fake|fraud).*?(upi|upi id|upi request)/u,
      /(यूपीआई|इउपिआई|ইউपিআই|upi|upi id|payment request|qr code).{0,20}(चेक|जांच|जाँच|যাচাই|परীক্ষा|safe|scam)|(?:नकली|फर्जी|ভুয়া|झूठा).{0,20}(यूपीआई|इउपिआई|ইউपিআই|upi)|(?:यूपीआई|इउपिआई|ইউपিআই|upi).{0,20}(नकल|फेक|ঝুঁকি)/u,
      /(ইউপিআই|upi|পেমেন্ট অনুরোধ|কিউআর কোড|কিউআর|আইডি).{0,20}(চেক|যাচাই|পরীক্ষা|scam|safe)/u,
      /(?:নকল|ফেক|ভুয়া|জাল|ভুল).{0,20}(upi|ইউপিআই|আইডি|পেমেন্ট অনুরোধ|কিউআর)/u,
    ])
  ) {
    return fallback.upi;
  }

  if (
    matchesAny([
      /(check|verify|safe|scam).*?(link|url|website)|(?:link|url|website).*?(check|verify|safe|scam)|(?:how can i check|want to check).*?(link|url|website)|(?:suspicious|fake|fraud).*?(link|url|website)/u,
      /(लिंक|लিঙ্ক|वेबसाइट|website|url).{0,20}(चेक|जांच|जाँच|যাচাই|परীক্ষा|safe|scam)|(?:संदिग्ध|संदेहजनक|फेक|ভুয়া|झूठा).{0,20}(लिंक|लিঙ্ক|ওয়েবসাইট)|(?:कैसे|किस\s+तरह|कীভাবে|कিভাবে|कেমন).{0,12}(लिंक|लিঙ্ক|ওয়েবसाइट).{0,12}(चेक|যাচাই|परীক্ষा)/u,
      /(লিঙ্ক|ওয়েবসাইট|website|url).{0,20}(চেক|যাচাই|পরীক্ষা|scam|safe)/u,
    ])
  ) {
    return fallback.link;
  }

  if (
    matchesAny([
      /(check|verify|safe|scam).*?(screenshot|screenshots|image|images|photo|photos|picture|pictures|screen capture)|(?:screenshot|screenshots|image|images|photo|photos|picture|pictures|screen capture).*?(check|verify|safe|scam)|(?:how can i check|want to check).*?(screenshot|image|photo|picture)|(?:suspicious|fake|fraud).*?(screenshot|image|photo|picture)/u,
      /(स्क्रिनशॉट|ছবি|ফটো|ইমেজ|পিকচার).{0,18}(चेक|जांच|जाँच|যাচাই|পরীক্ষा)|(?:कীভাবে|कিভাবে).{0,14}(स्क्रिनशॉट|ছবি|ফটো|ইমেজ|পিকচার).{0,15}(चेक|যাচাই|परिक्षा)/u,
      /(স্ক্রিনशট|ছবি|ফটো|ইমেজ|পিকচার).{0,18}(চেক|যাচাই|পরীক্ষা|scam|safe)/u,
    ])
  ) {
    return fallback.screenshot;
  }

  if (
    matchesAny([
      /(?:save|add|remember|keep|store).{0,30}(?:mom|mother|dad|father|wife|husband|brother|sister|family member|trusted contact|trusted person)|(?:mom|mother|dad|father|wife|husband|brother|sister|family member|trusted contact|trusted person).{0,30}(?:save|add|remember|keep|store)/u,
      /(?:save|add|remember|keep|store).{0,30}(?:family|trusted|contact|person|relative)|(?:family|trusted|contact|relative).{0,30}(?:save|add|remember|keep|store)/u,
      /(परिवार|विश्वस्त|भरोसेमंद|संपर्क|माँ|मम्मी|अम्मा|पिता|पत्नी|पति|भाई|बहन).{0,30}(सहेज|जोड़|रखें|रख|याद|सेव)|(?:सहेज|जोड़|रखें|रख|याद|सेव).{0,30}(परिवार|विश्वस्त|भरोसेमंद|संपर्क|माँ|मम्मी|अम्मा|पिता|पत्नी|पति|भाई|बहन)/u,
      /(পরিবার|বিশ্বস্ত|বাবা|মা|স্বামী|স্ত্রী|ভাই|বোন|যোগ|সেভ).{0,30}(সংরক্ষণ|যোগ|রাখুন|সেভ)|(?:সংরক্ষণ|যোগ|রাখুন|সেভ).{0,30}(পরিবার|বিশ্বস্ত|বাবা|মা|স্বামী|স্ত্রী|ভাই|বোন)/u,
    ])
  ) {
    return fallback.saveContact;
  }

  if (
    matchesAny([
      /(?:block|remove|delete|ban|stop|ignore).{0,20}(?:number|phone|caller|contact)|(?:number|phone|caller|contact).{0,20}(?:block|remove|delete|ban|stop)|(?:bl(?:ock)|delete|remove|ban).{0,20}(?:number|phone)/u,
      /(ब्लॉक|मिटाए|हटाएँ|रोकें|রखें|মুছে\s+ফেলুন|ব্লক).{0,20}(नंबर|फोन|कॉलर|नम্বর|ফোন\s+नम্বর|কলার)|(?:नंबर|फोन|कॉलर|नम্বর|ফोन\s+नम্বর|কলার).{0,20}(ब्लॉक|मिटाए|हटाएँ|रोकें|মুছে\s+ফেলুন|ব্লক)/u,
    ])
  ) {
    return fallback.unsupported;
  }

  if (
    matchesAny([
      /(?:lost money|sent money|transferred money|paid scammer|scammer|fraud|cheated|i think i was scammed|i got scammed|money was taken|what should i do if i was scammed|financial cyber fraud)/u,
      /(धोखाधड़ी|फ्रॉड|पैसे खोए|पैसा गया|घोटाला|संदिग्ध व्यक्ति|स्कैम).{0,20}|(?:प्रतारण|धोक|টাকা হারানো|টাকা গেছে).{0,20}/u,
      /(প্রতারণা|ধোকা|টাকা হারানো|টাকা গেছে|স্ক্যাম|ফ্রড).{0,20}/u,
    ])
  ) {
    return fallback.emergency;
  }

  if (
    matchesAny([
      /(how can i check|want to check|check.*phone|phone.*check|check.*number|number.*check|suspicious.*phone|suspicious.*number|phone.*suspicious|number.*suspicious|is this.*phone|is this.*number|caller.*scam|call.*scam)/u,
      /(फ़ोन|फोन|नंबर|कॉलर|नम্বর|फोन\s+नम্বর|কল).{0,18}(संदिग्ध|फर्जी|झूठा|घोटाला|स्कैम|চেক|যাচাই|পরীক্ষা)|(?:कীভাবে|कিভাবে).{0,12}(फोन|नम্বর|नम्बर|কল).{0,12}(चेक|যাচাই|परীক্ষा)/u,
      /(ফোন|নম্বর|কথা|কলার).{0,18}(সন্দেহজনক|ভুয়া|ফেক|স্ক্যাম|চেক|যাচাই|পরীক্ষা)/u,
    ])
  ) {
    return fallback.phoneCheck;
  }

  if (
    matchesAny([
      /(?:history|previous checks|saved checks|where can i find.*history|where do i find.*history)/u,
      /(इतिहास|पिछली जाँच|আগের পরীক্ষা|ইতিহাস)/u,
    ])
  ) {
    return fallback.history;
  }

  if (
    matchesAny([
      /(?:weekly report|weekly reports|weekly summary|insights?|summary)/u,
      /(साप्ताहिक रिपोर्ट|साप्ताहिक रिपोर्ट|जानकारी|रुझान|ইনসাইট|সামারি)/u,
    ])
  ) {
    return fallback.insights;
  }

  if (
    matchesAny([
      /(?:report a scam|report scam|file a report|report|reporting)/u,
      /(घोटाले की रिपोर्ट|रिपोर्ट|অভিযোগ)/u,
    ])
  ) {
    return fallback.report;
  }

  if (
    matchesAny([
      /(?:alerts?|warning|alert)/u,
      /(चेतावनी|अलर्ट|সতর্কতা|অ্যালার্ট)/u,
    ])
  ) {
    return fallback.alerts;
  }

  if (
    matchesAny([
      /(?:learn|learning|guide|phishing|how phishing works)/u,
      /(सीखें|सीखना|फ़िशिंग|फिशिंग|শিখুন|শিখতে|ফিশিং)/u,
    ])
  ) {
    return fallback.learn;
  }

  if (
    matchesAny([
      /(?:quiz|quizzes|practice|questionnaire)/u,
      /(प्रश्नोत्तरी|अभ्यास|कুইज|অনুশীলন)/u,
    ])
  ) {
    return fallback.quiz;
  }

  if (
    matchesAny([
      /(?:family|trusted contact|trusted person|relative)/u,
      /(परिवार|भरोसेमंद व्यक्ति|विश्वस्त संपर्क|ভাই|বোন|পরিবার|বিশ্বস্ত ব্যক্তি)/u,
    ])
  ) {
    return fallback.family;
  }

  if (
    matchesAny([
      /(?:settings?|accessibility|large text|contrast|language)/u,
      /(सेटिंग|सुलभता|बड़ा पाठ|বড় লেখা|সেটিং|অ্যাক্সেসিবিলিটি|ভাষা)/u,
    ])
  ) {
    return fallback.settings;
  }

  if (
    matchesAny([
      /(?:risk score|risk level|result|verdict)/u,
      /(जोखिम स्कोर|जोखिम स्तर|निरापत्तार स्कोर|ঝুঁকির স্কोर)/u,
    ])
  ) {
    return fallback.risk;
  }

  if (
    matchesAny([
      /(?:thanks|thank you|thank u|good|nice|great|amazing|appreciate it|oh nice|okay|alright|ok|good job)/u,
      /(धन्यवाद|शुक्रिया|अच्छा|बहुत अच्छा|ठीक है|बढ़िया|धন্যবাদ|ভাল|চমৎকার|ঠিক আছে|আচ্ছা)/u,
    ])
  ) {
    return fallback.greeting;
  }

  return undefined;
}
export { getFallbackAnswer };

function parseAnswer(content) {
  if (typeof content !== "string") return "";
  const trimmed = content.trim();
  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed.answer === "string" ? parsed.answer.trim() : "";
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(trimmed.slice(start, end + 1));
        return typeof parsed.answer === "string" ? parsed.answer.trim() : "";
      } catch {
        return "";
      }
    }
    return "";
  }
}

export async function answerAssistantQuestion({ question, language }) {
  const safeLanguage = FALLBACK_ANSWERS[language] ? language : "en";
  const safeQuestion = typeof question === "string" ? question.trim() : "";
  const fallbackAnswer = getFallbackAnswer(safeQuestion, safeLanguage);
  if (fallbackAnswer) return fallbackAnswer;

  if (
    !process.env.AI_API_KEY ||
    !process.env.AI_API_URL ||
    !process.env.AI_MODEL
  ) {
    console.warn("[assistant] AI service not configured for this request.");
    return DEFAULT_FALLBACKS[safeLanguage];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(process.env.AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              language: LANGUAGE_NAMES[safeLanguage],
              question: redactSensitiveInput(safeQuestion).slice(0, 1200),
            }),
          },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const statusCode = response.status;
      const reason =
        statusCode === 401
          ? "invalid credentials"
          : statusCode === 429
            ? "rate limited"
            : `HTTP ${statusCode}`;
      console.warn("[assistant] AI provider rejected the request.", {
        status: statusCode,
        reason,
      });
      return DEFAULT_FALLBACKS[safeLanguage];
    }

    const payload = await response.json();
    const content =
      payload?.choices?.[0]?.message?.content ??
      payload?.output_text ??
      payload?.content ??
      payload?.result;
    const answer = parseAnswer(content);
    if (!answer || answer.length > 5000) {
      console.warn("[assistant] AI provider returned an empty or malformed response.");
      return DEFAULT_FALLBACKS[safeLanguage];
    }
    return answer;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    const isTimeout =
      error && typeof error === "object" && "name" in error && error.name === "AbortError";
    console.warn("[assistant] AI provider call failed.", {
      type: isTimeout ? "timeout" : "request",
      reason,
    });
    return DEFAULT_FALLBACKS[safeLanguage];
  } finally {
    clearTimeout(timeout);
  }
}
