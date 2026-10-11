import { redactSensitiveInput } from "./scamDetectionService.js";

const LANGUAGE_NAMES = {
  en: "English",
  hi: "Hindi",
  bn: "Bengali",
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
      "Open Check and choose Phone Number, then enter the number. A report or warning is only an indicator, and no reports do not prove a caller is genuine. Verify callers using an official number you find yourself.",
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
    report:
      "সন্দেহজনক প্রতারণার তথ্য নথিভুক্ত করতে Report খুলুন। ভারতে টাকা হারালে দ্রুত ১৯৩০ নম্বরে কল করুন এবং cybercrime.gov.in-এ রিপোর্ট করুন।",
    settings:
      "অ্যাপের ভাষা, লেখার আকার, কনট্রাস্ট, অ্যানিমেশন এবং ভয়েস পছন্দ বদলাতে Settings খুলুন।",
    risk: "ঝুঁকির স্কোরে পাওয়া সতর্কতার লক্ষণ বোঝায়; এটি প্রতারণার নিশ্চিত সম্ভাবনা নয়। কম স্কোর নিরাপদ হওয়ার প্রমাণ নয়। অফিসিয়াল মাধ্যমে যাচাই করুন।",
  },
};

const SYSTEM_PROMPT = `You are the friendly ScamShield digital safety assistant for people in India.
Answer the user's question clearly and concisely in the exact language and script requested: English, Hindi (हिन्दी), or Bengali (বাংলা). Do not merely translate labels; understand the question and answer it in that language. Use simple, reassuring language and short steps, especially for users with limited technical experience.
Explain ScamShield features accurately: message, link, phone number, email, UPI ID and screenshot checks; scam alerts; weekly insights and reports; learning guides; quizzes; trusted family contacts; check history; accessibility settings; and emergency support. Tell users that checks are indicators, not proof that something is safe.
Never claim a message, link, caller, email, or UPI ID is definitely safe. Do not request, repeat, or encourage sharing OTPs, passwords, PINs, CVVs, banking details, or other secrets.
If the user may have lost money to financial cyber fraud in India, advise them to stop interacting with the suspected scammer, not share any more credentials, call 1930 promptly, and report at the official portal https://cybercrime.gov.in. Be calm and supportive.
Do not invent app functionality, account details, or facts. If unsure, say so and suggest verifying through an organization's official channel.
Return only a JSON object with one string property named "answer".`;

function getFallbackAnswer(question, language) {
  const normalized = question
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[.!?,।؛؟]+/g, " ")
    .trim();
  const fallback = FALLBACK_ANSWERS[language];

  if (
    /^(hi|hello|hey|hii|hiya|good morning|good afternoon|good evening|how are you|how r u|can you help(?: me)?|could you help(?: me)?|what can you help me with|help me|नमस्ते|नमस्कार|हेलो|हाय|कैसे हैं|कैसी हैं|कैसे हो|क्या आप मेरी मदद कर सकते हैं|मदद कीजिए|হ্যালো|নমস্কার|কেমন আছেন|কেমন আছো|আপনি কি আমাকে সাহায্য করতে পারেন|আমাকে সাহায্য করুন)(\s|$)/u.test(
      normalized,
    )
  ) {
    return fallback.greeting;
  }
  if (
    /\b(what is scamshield|what does scamshield do|about scamshield)\b|scamshield.{0,25}(?:क्या है|क्या करता)|(?:স্ক্যামশিল্ড|scamshield).{0,25}(?:কী|কি)(?:\s|$)/u.test(
      normalized,
    )
  ) {
    return fallback.about;
  }
  if (
    /\b(how can i check|how do i check|check a suspicious message|check this message|suspicious message)\b|संदिग्ध संदेश|मैसेज.{0,12}जाँच|संदेश.{0,12}जांच|সন্দেহজনক বার্তা|বার্তা.{0,12}(?:পরীক্ষা|যাচাই)/u.test(
      normalized,
    )
  ) {
    return fallback.message;
  }
  if (
    /\b(fake upi|upi id|upi request|identify.*upi)\b|नकली UPI|फर्जी UPI|UPI ID|यूपीआई|নকল UPI|ভুয়া UPI|UPI ID|ইউপিআই/u.test(
      normalized,
    )
  ) {
    return fallback.upi;
  }
  if (
    /\b(screenshot|screen shot|image|photo)\b|स्क्रीनशॉट|तस्वीर|ছবি|স্ক্রিনশট/u.test(
      normalized,
    )
  ) {
    return fallback.screenshot;
  }
  if (/\b(email|e-mail)\b|ईमेल|इमेल|ইমেল/u.test(normalized))
    return fallback.email;
  if (
    /\b(phone number|phone|caller|call)\b|फ़ोन नंबर|फोन नंबर|फ़ोन|फोन|कॉलर|কলার/u.test(
      normalized,
    )
  ) {
    return fallback.phone;
  }
  if (/\b(link|url|website)\b|लिंक|वेबसाइट|ওয়েবসাইট|লিঙ্ক/u.test(normalized))
    return fallback.link;
  if (
    /\b(history|previous checks|saved checks)\b|इतिहास|पिछली जाँच|আগের পরীক্ষা|ইতিহাস/u.test(
      normalized,
    )
  ) {
    return fallback.history;
  }
  if (/\b(weekly report|weekly reports|weekly summary)\b|साप्ताहिक रिपोर्ट|সাপ্তাহিক রিপোর্ট/u.test(normalized)) {
    return fallback.insights;
  }
  if (/\b(report a scam|report scam|file a report|report|reporting)\b|घोटाले की रिपोर्ट|रिपোর্ট|রিপোর্ট|অভিযোগ/u.test(normalized)) {
    return fallback.report;
  }
  if (/\b(insights?|weekly|summary)\b|जानकारी|साप्ताहिक|रुझान|সাপ্তাহিক|ইনসাইট/u.test(normalized)) {
    return fallback.insights;
  }
  if (
    /\b(alerts?|warning)\b|चेतावनी|अलर्ट|সতর্কতা|অ্যালার্ট/u.test(normalized)
  ) {
    return fallback.alerts;
  }
  if (
    /\b(learn|learning|guide|phishing)\b|सीखें|सीखना|फ़िशिंग|फिशिंग|শিখুন|শিখতে|ফিশিং/u.test(
      normalized,
    )
  ) {
    return fallback.learn;
  }
  if (
    /\b(quiz|quizzes|practice)\b|प्रश्नोत्तरी|अभ्यास|কুইজ|অনুশীলন/u.test(
      normalized,
    )
  )
    return fallback.quiz;
  if (
    /\b(family|trusted contact|trusted person)\b|परिवार|भरोसेमंद व्यक्ति|विश्वस्त संपर्क|পরিবার|বিশ্বস্ত ব্যক্তি/u.test(
      normalized,
    )
  ) {
    return fallback.family;
  }
  if (
    /\b(settings?|accessibility|large text|contrast)\b|सेटिंग|सुलभता|बड़ा पाठ|বড় লেখা|সেটিং|অ্যাক্সেসিবিলিটি/u.test(
      normalized,
    )
  ) {
    return fallback.settings;
  }
  if (
    /\b(risk score|risk level|result|verdict)\b|जोखिम स्कोर|जोखिम स्तर|নিরাপত্তার স্কোর|ঝুঁকির স্কোর/u.test(
      normalized,
    )
  ) {
    return fallback.risk;
  }
  return "";
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
  const fallbackAnswer = getFallbackAnswer(question, language);
  if (fallbackAnswer) return fallbackAnswer;

  if (
    !process.env.AI_API_KEY ||
    !process.env.AI_API_URL ||
    !process.env.AI_MODEL
  ) {
    const error = new Error("The assistant is not configured.");
    error.status = 503;
    error.publicCode = "AI_NOT_CONFIGURED";
    error.publicMessage =
      "The AI assistant service is not configured. Set AI_API_KEY, AI_API_URL, and AI_MODEL in the backend environment, then restart the backend.";
    throw error;
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
              language: LANGUAGE_NAMES[language],
              question: redactSensitiveInput(question).slice(0, 1200),
            }),
          },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = new Error(`AI provider returned HTTP ${response.status}.`);
      error.status = response.status === 429 ? 503 : 502;
      error.publicCode =
        response.status === 401 || response.status === 403
          ? "AI_INVALID_CREDENTIALS"
          : response.status === 429
            ? "AI_RATE_LIMITED"
            : "AI_UNAVAILABLE";
      error.publicMessage =
        response.status === 401 || response.status === 403
          ? "The AI service rejected its backend credentials. Check the backend AI_API_KEY and try again."
          : response.status === 429
            ? "The AI service is temporarily rate limited. Please wait a moment and try again."
            : "The AI service could not answer right now. Please try again.";
      throw error;
    }

    const payload = await response.json();
    const content =
      payload?.choices?.[0]?.message?.content ??
      payload?.output_text ??
      payload?.content ??
      payload?.result;
    const answer = parseAnswer(content);
    if (!answer || answer.length > 5000) {
      const error = new Error(
        "The AI provider returned an invalid assistant response.",
      );
      error.status = 502;
      error.publicCode = "AI_BAD_RESPONSE";
      error.publicMessage =
        "The assistant could not answer right now. Please try again.";
      throw error;
    }
    return answer;
  } catch (error) {
    if (error.status) throw error;
    const providerError = new Error("The AI provider could not be reached.");
    providerError.status = error.name === "AbortError" ? 504 : 502;
    providerError.publicCode =
      error.name === "AbortError" ? "AI_TIMEOUT" : "AI_UNAVAILABLE";
    providerError.publicMessage =
      error.name === "AbortError"
        ? "The AI service took too long to respond. Please try again."
        : "The AI service could not connect. Check the backend AI_API_URL and network, then try again.";
    throw providerError;
  } finally {
    clearTimeout(timeout);
  }
}
