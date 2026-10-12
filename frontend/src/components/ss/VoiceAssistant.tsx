import { useNavigate } from "@tanstack/react-router";
import {
  ArrowUpRight,
  AudioLines,
  Bot,
  LoaderCircle,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, askAssistant, transcribeAssistantAudio } from "@/services/api";
import { useApp } from "@/lib/app-state";
import type { UiLanguage } from "@/lib/types";

type Message = { role: "user" | "assistant"; text: string; language: UiLanguage };
type Status = "idle" | "listening" | "transcribing" | "processing" | "speaking";
interface BrowserSpeechResult {
  isFinal: boolean;
  0: { transcript: string };
}

interface BrowserSpeechResultEvent {
  resultIndex: number;
  results: ArrayLike<BrowserSpeechResult>;
}

interface BrowserSpeechErrorEvent {
  error: string;
}

interface BrowserSpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: BrowserSpeechResultEvent) => void) | null;
  onerror: ((event: BrowserSpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface BrowserSpeechRecognitionConstructor {
  new (): BrowserSpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

type AssistantPath =
  | "/check"
  | "/emergency"
  | "/alerts"
  | "/insights"
  | "/report"
  | "/quiz"
  | "/learn"
  | "/history"
  | "/family"
  | "/settings";

const COPY: Record<
  UiLanguage,
  {
    title: string;
    welcome: string;
    intro: string;
    language: string;
    placeholder: string;
    send: string;
    open: string;
    close: string;
    listen: string;
    stopListening: string;
    speakResponse: string;
    stopSpeaking: string;
    listening: string;
    transcribing: string;
    processing: string;
    speaking: string;
    ready: string;
    privacy: string;
    micUnsupported: string;
    micDenied: string;
    insecureOrigin: string;
    speechFailed: string;
    noMicrophone: string;
    noSpeech: string;
    emptyRecording: string;
    transcriptionSilence: string;
    recordingTooLarge: string;
    speechNetwork: string;
    speechService: string;
    transcriptionNotConfigured: string;
    transcriptionModelInit: string;
    transcriptionDownloadFailed: string;
    transcriptionPythonMissing: string;
    transcriptionQueueFull: string;
    transcriptionInvalidAudio: string;
    transcriptionFailed: string;
    transcriptionNoSpeech: string;
    transcriptionRequestLimit: string;
    transcriptionTimeout: string;
    browserFallback: string;
    browserFallbackNotice: string;
    voiceUnsupported: string;
    unavailable: string;
    serviceNotConfigured: string;
    invalidAiCredentials: string;
    serviceFailure: string;
    aiRateLimit: string;
    aiTimeout: string;
    networkError: string;
    rateLimit: string;
    sessionExpired: string;
    retry: string;
    emergency: string;
    emergencyAnswer: string;
    emergencyCta: string;
    openPage: string;
    suggestion: string;
    suggestionEmergency: string;
    enterQuestion: string;
  }
> = {
  en: {
    title: "ScamShield assistant",
    welcome: "Hello! I’m here to help you stay safe online.",
    intro: "Ask me about scams or how to use ScamShield.",
    language: "Conversation language",
    placeholder: "Type your question here…",
    send: "Send question",
    open: "Open Voice Assistant",
    close: "Close assistant",
    listen: "Speak your question",
    stopListening: "Stop listening",
    speakResponse: "Read this response aloud",
    stopSpeaking: "Stop speaking",
    listening: "Listening… speak now",
    transcribing: "Turning your speech into text…",
    processing: "Preparing your answer…",
    speaking: "Speaking the answer",
    ready: "Ready when you are",
    privacy: "Please don’t include passwords, OTPs, PINs, or bank details.",
    micUnsupported:
      "Voice input for this language is not available in this browser. You can type instead.",
    micDenied: "Microphone access was blocked. Allow it in browser settings, or type instead.",
    insecureOrigin:
      "Voice input requires a secure page. Open ScamShield over HTTPS or type instead.",
    speechFailed: "We couldn’t hear that clearly. Please try again or type your question.",
    noMicrophone: "No microphone was found. Connect a microphone or type your question.",
    noSpeech: "I couldn’t hear anything. Please try again.",
    emptyRecording:
      "No audio was recorded. Check that the microphone is enabled and speak before stopping.",
    transcriptionSilence:
      "The recording contains no audible microphone input. Check the selected input and its volume, then try again.",
    recordingTooLarge: "That recording is too long to process. Please record a shorter question.",
    speechNetwork:
      "Voice recognition needs a network connection. Check your connection and try again.",
    speechService: "Speech recognition is temporarily unavailable. Please try again.",
    transcriptionNotConfigured:
      "Local speech transcription is not ready. Install the backend speech requirements and restart the backend.",
    transcriptionModelInit:
      "The local Whisper model could not load. Check the first-time model download, disk space, and backend logs.",
    transcriptionDownloadFailed:
      "Whisper could not download its model. Check access to Hugging Face, then try again; incomplete downloads are kept for resuming.",
    transcriptionPythonMissing:
      "Python could not start local Whisper. Install the backend speech requirements and restart the backend.",
    transcriptionQueueFull:
      "Local Whisper is processing other recordings. Please wait a moment and try again.",
    transcriptionInvalidAudio:
      "Whisper could not read this recording. Please make a new recording or type your question.",
    transcriptionFailed:
      "Local Whisper could not transcribe this recording. Please try again or type your question.",
    transcriptionNoSpeech:
      "Audio was received, but speech could not be understood. Check the selected language, speak clearly, and record a little longer.",
    transcriptionRequestLimit:
      "Too many voice requests were made recently. Please wait a moment and try again.",
    transcriptionTimeout: "Voice transcription took too long. Please try again.",
    browserFallback: "Try browser speech recognition",
    browserFallbackNotice:
      "Optional fallback: your browser may send speech to its recognition service. It usually needs internet, and support and accuracy vary by browser.",
    voiceUnsupported:
      "This browser has no English voice available. Your answer is still shown here.",
    unavailable: "The assistant is temporarily unavailable. Please try again later.",
    serviceNotConfigured:
      "The AI answer service is not configured yet. The assistant can still answer greetings and common ScamShield questions. For other questions, ask your administrator to configure AI_API_KEY, AI_API_URL, and AI_MODEL on the backend.",
    invalidAiCredentials:
      "The AI service rejected its backend credentials. Ask your administrator to check AI_API_KEY on the backend.",
    serviceFailure:
      "The AI service could not answer this question. Please check the backend AI service settings or try again later.",
    aiRateLimit: "The AI service is busy. Please wait a moment and try again.",
    aiTimeout: "The AI service took too long to respond. Please try again.",
    networkError: "We couldn’t connect. Check your internet and try again.",
    rateLimit: "Please wait a moment before asking another question.",
    sessionExpired: "Your sign-in has expired. Please sign in again to continue.",
    retry: "Try again",
    emergency: "If you think you were scammed",
    emergencyAnswer:
      "If this happened to you, I’m sorry. Stop replying to the suspected scammer. Do not share any OTP, password, PIN, or more money. If money was lost in India, call 1930 as soon as possible and report it at cybercrime.gov.in. Ask someone you trust to stay with you.",
    emergencyCta: "Open emergency help",
    openPage: "Open the related ScamShield page",
    suggestion: "How do I check a suspicious message?",
    suggestionEmergency: "What should I do if I was scammed?",
    enterQuestion: "Please type a question first.",
  },
  hi: {
    title: "ScamShield सहायक",
    welcome: "नमस्ते! मैं इंटरनेट पर सुरक्षित रहने में आपकी मदद करूँगा।",
    intro: "घोटालों या ScamShield इस्तेमाल करने के बारे में पूछें।",
    language: "बातचीत की भाषा",
    placeholder: "अपना सवाल यहाँ लिखें…",
    send: "सवाल भेजें",
    open: "वॉइस सहायक खोलें",
    close: "सहायक बंद करें",
    listen: "अपना सवाल बोलें",
    stopListening: "सुनना बंद करें",
    speakResponse: "यह जवाब सुनें",
    stopSpeaking: "आवाज़ बंद करें",
    listening: "सुन रहा हूँ… अब बोलें",
    transcribing: "आपकी आवाज़ को लिखे हुए शब्दों में बदला जा रहा है…",
    processing: "जवाब तैयार हो रहा है…",
    speaking: "जवाब पढ़कर सुनाया जा रहा है",
    ready: "जब चाहें पूछें",
    privacy: "कृपया पासवर्ड, OTP, PIN या बैंक की जानकारी न लिखें।",
    micUnsupported:
      "इस ब्राउज़र में इस भाषा के लिए आवाज़ से लिखना उपलब्ध नहीं है। आप टाइप कर सकते हैं।",
    micDenied: "माइक्रोफ़ोन की अनुमति नहीं मिली। ब्राउज़र सेटिंग में अनुमति दें या टाइप करें।",
    insecureOrigin: "आवाज़ से सवाल पूछने के लिए सुरक्षित पेज चाहिए। HTTPS खोलें या सवाल टाइप करें।",
    speechFailed: "आपकी बात साफ़ सुनाई नहीं दी। फिर कोशिश करें या सवाल टाइप करें।",
    noMicrophone: "माइक्रोफ़ोन नहीं मिला। माइक्रोफ़ोन जोड़ें या सवाल टाइप करें।",
    noSpeech: "कुछ सुनाई नहीं दिया। कृपया फिर से कोशिश करें।",
    emptyRecording:
      "कोई आवाज़ रिकॉर्ड नहीं हुई। माइक्रोफ़ोन चालू है या नहीं जाँचें और रोकने से पहले बोलें।",
    transcriptionSilence:
      "रिकॉर्डिंग में माइक्रोफ़ोन की आवाज़ नहीं मिली। चुना हुआ माइक्रोफ़ोन और उसका वॉल्यूम जाँचकर फिर कोशिश करें।",
    recordingTooLarge: "रिकॉर्डिंग बहुत लंबी है। कृपया छोटा सवाल रिकॉर्ड करें।",
    speechNetwork: "आवाज़ पहचानने के लिए इंटरनेट चाहिए। कनेक्शन जाँचकर फिर कोशिश करें।",
    speechService: "आवाज़ पहचान सेवा अभी उपलब्ध नहीं है। कृपया फिर कोशिश करें।",
    transcriptionNotConfigured:
      "स्थानीय आवाज़ पहचान तैयार नहीं है। backend की speech requirements इंस्टॉल करके backend फिर शुरू करें।",
    transcriptionModelInit:
      "स्थानीय Whisper मॉडल लोड नहीं हुआ। पहली बार डाउनलोड, डिस्क की जगह और backend लॉग जाँचें।",
    transcriptionDownloadFailed:
      "Whisper मॉडल डाउनलोड नहीं हो पाया। Hugging Face से कनेक्शन जाँचें और फिर कोशिश करें; अधूरे डाउनलोड को दोबारा शुरू किया जा सकता है।",
    transcriptionPythonMissing:
      "स्थानीय Whisper के लिए Python शुरू नहीं हो पाया। backend की speech requirements इंस्टॉल करें।",
    transcriptionQueueFull:
      "स्थानीय Whisper दूसरी रिकॉर्डिंग पर काम कर रहा है। थोड़ी देर बाद फिर कोशिश करें।",
    transcriptionInvalidAudio:
      "Whisper यह रिकॉर्डिंग पढ़ नहीं पाया। नई रिकॉर्डिंग करें या सवाल टाइप करें।",
    transcriptionFailed:
      "स्थानीय Whisper इस रिकॉर्डिंग को लिख नहीं पाया। फिर कोशिश करें या सवाल टाइप करें।",
    transcriptionNoSpeech:
      "आवाज़ रिकॉर्ड हुई, लेकिन बात समझ में नहीं आई। चुनी हुई भाषा जाँचें, साफ़ बोलें और थोड़ी लंबी रिकॉर्डिंग करें।",
    transcriptionRequestLimit:
      "हाल में बहुत सारे आवाज़ अनुरोध हुए हैं। थोड़ी देर बाद फिर कोशिश करें।",
    transcriptionTimeout: "आवाज़ को लिखने में बहुत समय लगा। कृपया फिर कोशिश करें।",
    browserFallback: "ब्राउज़र से आवाज़ पहचानने की कोशिश करें",
    browserFallbackNotice:
      "वैकल्पिक तरीका: ब्राउज़र आपकी आवाज़ अपनी पहचान सेवा को भेज सकता है। आमतौर पर इंटरनेट चाहिए; सुविधा और सटीकता ब्राउज़र के अनुसार बदलती है।",
    voiceUnsupported: "इस ब्राउज़र में हिन्दी आवाज़ उपलब्ध नहीं है। जवाब यहाँ पढ़ सकते हैं।",
    unavailable: "सहायक अभी उपलब्ध नहीं है। कृपया थोड़ी देर बाद कोशिश करें।",
    serviceNotConfigured:
      "AI जवाब सेवा अभी सेट नहीं है। सहायक सामान्य अभिवादन और ScamShield से जुड़े आम सवालों के जवाब दे सकता है। अन्य सवालों के लिए व्यवस्थापक backend में AI_API_KEY, AI_API_URL और AI_MODEL सेट करें।",
    invalidAiCredentials:
      "AI सेवा ने backend की पहचान स्वीकार नहीं की। व्यवस्थापक से backend में AI_API_KEY जाँचने को कहें।",
    serviceFailure:
      "AI सेवा इस सवाल का जवाब नहीं दे पाई। Backend AI सेटिंग जाँचें या बाद में फिर कोशिश करें।",
    aiRateLimit: "AI सेवा अभी व्यस्त है। थोड़ी देर बाद फिर कोशिश करें।",
    aiTimeout: "AI सेवा को जवाब देने में बहुत समय लगा। कृपया फिर कोशिश करें।",
    networkError: "कनेक्शन नहीं हो पाया। इंटरनेट जाँचकर फिर कोशिश करें।",
    rateLimit: "अगला सवाल पूछने से पहले कृपया थोड़ी देर रुकें।",
    sessionExpired: "आपका लॉग इन समाप्त हो गया है। जारी रखने के लिए फिर से लॉग इन करें।",
    retry: "फिर कोशिश करें",
    emergency: "अगर आपको लगता है कि आपके साथ धोखाधड़ी हुई है",
    emergencyAnswer:
      "अगर आपके साथ ऐसा हुआ है तो मुझे अफ़सोस है। संदिग्ध व्यक्ति से बात करना बंद करें। कोई OTP, पासवर्ड, PIN या और पैसे न दें। भारत में पैसे का नुकसान हुआ है तो जल्द से जल्द 1930 पर कॉल करें और cybercrime.gov.in पर रिपोर्ट करें। किसी भरोसेमंद व्यक्ति को अपने साथ रखें।",
    emergencyCta: "आपातकालीन सहायता खोलें",
    openPage: "संबंधित ScamShield पेज खोलें",
    suggestion: "संदिग्ध संदेश की जाँच कैसे करूँ?",
    suggestionEmergency: "धोखाधड़ी होने पर मुझे क्या करना चाहिए?",
    enterQuestion: "पहले अपना सवाल लिखें।",
  },
  bn: {
    title: "ScamShield সহায়ক",
    welcome: "নমস্কার! অনলাইনে নিরাপদ থাকতে আমি আপনাকে সাহায্য করব।",
    intro: "প্রতারণা বা ScamShield কীভাবে ব্যবহার করবেন, জিজ্ঞাসা করুন।",
    language: "কথোপকথনের ভাষা",
    placeholder: "এখানে আপনার প্রশ্ন লিখুন…",
    send: "প্রশ্ন পাঠান",
    open: "ভয়েস সহায়ক খুলুন",
    close: "সহায়ক বন্ধ করুন",
    listen: "আপনার প্রশ্ন বলুন",
    stopListening: "শোনা বন্ধ করুন",
    speakResponse: "এই উত্তরটি শুনুন",
    stopSpeaking: "কথা বলা থামান",
    listening: "শুনছি… এখন বলুন",
    transcribing: "আপনার কথা লেখায় রূপান্তর করা হচ্ছে…",
    processing: "উত্তর তৈরি হচ্ছে…",
    speaking: "উত্তরটি বলা হচ্ছে",
    ready: "আপনি প্রস্তুত হলে জিজ্ঞাসা করুন",
    privacy: "অনুগ্রহ করে পাসওয়ার্ড, OTP, PIN বা ব্যাঙ্কের তথ্য লিখবেন না।",
    micUnsupported: "এই ব্রাউজারে এই ভাষার জন্য ভয়েস ইনপুট নেই। আপনি লিখে প্রশ্ন করতে পারেন।",
    micDenied: "মাইক্রোফোনের অনুমতি বন্ধ আছে। ব্রাউজার সেটিংসে অনুমতি দিন বা লিখুন।",
    insecureOrigin: "কথা বলার জন্য নিরাপদ পৃষ্ঠা দরকার। HTTPS খুলুন অথবা প্রশ্নটি লিখুন।",
    speechFailed: "আপনার কথা স্পষ্ট শোনা যায়নি। আবার বলুন বা প্রশ্নটি লিখুন।",
    noMicrophone: "মাইক্রোফোন পাওয়া যায়নি। মাইক্রোফোন যুক্ত করুন বা প্রশ্নটি লিখুন।",
    noSpeech: "কিছু শোনা যায়নি। আবার চেষ্টা করুন।",
    emptyRecording:
      "কোনো অডিও রেকর্ড হয়নি। মাইক্রোফোন চালু আছে কি না দেখুন এবং থামানোর আগে কথা বলুন।",
    transcriptionSilence:
      "রেকর্ডিংয়ে মাইক্রোফোনের কোনো শোনা যায় এমন শব্দ নেই। নির্বাচিত ইনপুট ও ভলিউম পরীক্ষা করে আবার চেষ্টা করুন।",
    recordingTooLarge: "রেকর্ডিংটি খুব বড়। অনুগ্রহ করে ছোট প্রশ্ন রেকর্ড করুন।",
    speechNetwork: "কথা চিনতে ইন্টারনেট সংযোগ দরকার। সংযোগ দেখে আবার চেষ্টা করুন।",
    speechService: "কথা চেনার পরিষেবা এখন পাওয়া যাচ্ছে না। আবার চেষ্টা করুন।",
    transcriptionNotConfigured:
      "স্থানীয় কথা চেনার ব্যবস্থা তৈরি নেই। backend-এর speech requirements ইনস্টল করে backend আবার চালু করুন।",
    transcriptionModelInit:
      "স্থানীয় Whisper মডেল লোড হয়নি। প্রথম ডাউনলোড, ডিস্কের জায়গা এবং backend লগ পরীক্ষা করুন।",
    transcriptionDownloadFailed:
      "Whisper মডেল ডাউনলোড হয়নি। Hugging Face সংযোগ পরীক্ষা করে আবার চেষ্টা করুন; অসম্পূর্ণ ডাউনলোড থেকে আবার শুরু হবে।",
    transcriptionPythonMissing:
      "স্থানীয় Whisper চালাতে Python পাওয়া যায়নি। backend-এর speech requirements ইনস্টল করুন।",
    transcriptionQueueFull:
      "স্থানীয় Whisper অন্য রেকর্ডিং প্রক্রিয়া করছে। একটু অপেক্ষা করে আবার চেষ্টা করুন।",
    transcriptionInvalidAudio:
      "Whisper এই রেকর্ডিং পড়তে পারেনি। আবার রেকর্ড করুন বা প্রশ্নটি লিখুন।",
    transcriptionFailed:
      "স্থানীয় Whisper এই রেকর্ডিং লিখতে পারেনি। আবার চেষ্টা করুন বা প্রশ্নটি লিখুন।",
    transcriptionNoSpeech:
      "অডিও পাওয়া গেছে, কিন্তু কথা বোঝা যায়নি। নির্বাচিত ভাষা দেখুন, স্পষ্ট করে একটু দীর্ঘ সময় বলুন।",
    transcriptionRequestLimit:
      "সম্প্রতি অনেক ভয়েস অনুরোধ হয়েছে। একটু অপেক্ষা করে আবার চেষ্টা করুন।",
    transcriptionTimeout: "কথা লিখতে বেশি সময় লেগেছে। আবার চেষ্টা করুন।",
    browserFallback: "ব্রাউজারের কথা শনাক্তকরণ চেষ্টা করুন",
    browserFallbackNotice:
      "ঐচ্ছিক বিকল্প: ব্রাউজার আপনার কথা তার শনাক্তকরণ পরিষেবায় পাঠাতে পারে। সাধারণত ইন্টারনেট লাগে; সুবিধা ও নির্ভুলতা ব্রাউজারভেদে আলাদা।",
    voiceUnsupported: "এই ব্রাউজারে বাংলা কণ্ঠস্বর নেই। উত্তরটি এখানে পড়তে পারবেন।",
    unavailable: "সহায়কটি এখন পাওয়া যাচ্ছে না। পরে আবার চেষ্টা করুন।",
    serviceNotConfigured:
      "AI উত্তর পরিষেবাটি এখনও সেট করা হয়নি। সহায়ক সাধারণ অভিবাদন এবং ScamShield-এর পরিচিত প্রশ্নের উত্তর দিতে পারে। অন্য প্রশ্নের জন্য প্রশাসককে backend-এ AI_API_KEY, AI_API_URL এবং AI_MODEL সেট করতে বলুন।",
    invalidAiCredentials:
      "AI পরিষেবাটি backend-এর পরিচয় গ্রহণ করেনি। প্রশাসককে backend-এ AI_API_KEY পরীক্ষা করতে বলুন।",
    serviceFailure:
      "AI পরিষেবাটি এই প্রশ্নের উত্তর দিতে পারেনি। Backend AI সেটিং পরীক্ষা করুন অথবা পরে আবার চেষ্টা করুন।",
    aiRateLimit: "AI পরিষেবা এখন ব্যস্ত। একটু অপেক্ষা করে আবার চেষ্টা করুন।",
    aiTimeout: "AI পরিষেবার উত্তর দিতে বেশি সময় লেগেছে। আবার চেষ্টা করুন।",
    networkError: "সংযোগ করা যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।",
    rateLimit: "পরের প্রশ্ন করার আগে একটু অপেক্ষা করুন।",
    sessionExpired: "আপনার সাইন-ইন শেষ হয়েছে। চালিয়ে যেতে আবার সাইন-ইন করুন।",
    retry: "আবার চেষ্টা করুন",
    emergency: "আপনার মনে হলে যে আপনার সঙ্গে প্রতারণা হয়েছে",
    emergencyAnswer:
      "আপনার সঙ্গে এমন হয়ে থাকলে আমি দুঃখিত। সন্দেহভাজন ব্যক্তির সঙ্গে যোগাযোগ বন্ধ করুন। আর কোনো OTP, পাসওয়ার্ড, PIN বা টাকা দেবেন না। ভারতে টাকা হারালে দ্রুত ১৯৩০ নম্বরে কল করুন এবং cybercrime.gov.in-এ রিপোর্ট করুন। আপনার বিশ্বস্ত কাউকে পাশে রাখুন।",
    emergencyCta: "জরুরি সহায়তা খুলুন",
    openPage: "সম্পর্কিত ScamShield পৃষ্ঠা খুলুন",
    suggestion: "সন্দেহজনক বার্তা কীভাবে পরীক্ষা করব?",
    suggestionEmergency: "প্রতারণার শিকার হলে কী করব?",
    enterQuestion: "আগে আপনার প্রশ্ন লিখুন।",
  },
};

function suggestedPathFor(question: string): AssistantPath | undefined {
  const text = question.toLocaleLowerCase();
  if (isEmergencyQuestion(text)) return "/emergency";
  if (
    /\b(check|message|sms|link|phone|number|email|upi|screenshot|qr)\b|जाँच|जांच|संदेश|लिंक|नंबर|फ़ोन|फोन|ईमेल|স্ক্যাম|বার্তা|লিঙ্ক|নম্বর|ইমেল|স্ক্রিনশট/.test(
      text,
    )
  ) {
    return "/check";
  }
  if (/\b(file a report|report a scam|report this)\b|रिपोर्ट दर्ज|অভিযোগ জানান/.test(text)) {
    return "/report";
  }
  if (/\b(alerts?|warning|scam alert)\b|चेतावनी|अलर्ट|সতর্কতা|সতর্কবার্তা/.test(text))
    return "/alerts";
  if (/\b(insights?|weekly)\b|साप्ताहिक|অন্তর্দৃষ্টি|সাপ্তাহিক/.test(text)) return "/insights";
  if (/\b(quiz|test)\b|प्रश्नोत्तरी|কুইজ/.test(text)) return "/quiz";
  if (/\b(learn|lesson|phishing|guide)\b|सीख|फ़िशिंग|ফিশিং|শিখ/.test(text)) return "/learn";
  if (/\b(history|previous checks)\b|इतिहास|আগের যাচাই/.test(text)) return "/history";
  if (
    /\b(family|trusted contact|trusted person)\b|परिवार|भरोसेमंद व्यक्ति|পরিবার|বিশ্বস্ত/.test(text)
  )
    return "/family";
  if (
    /\b(settings?|accessibility|large text)\b|सेटिंग|सुलभता|बड़ा पाठ|সেটিং|অ্যাক্সেসিবিলিটি/.test(
      text,
    )
  )
    return "/settings";
  return undefined;
}

function isEmergencyQuestion(text: string) {
  return (
    /\b(?:i (?:think|believe) i was scammed|i (?:was|got) scammed|i(?:'ve| have) been scammed|someone scammed me|i lost (?:money|funds)|money (?:was )?(?:taken|stolen)|i shared (?:my )?(?:otp|password|pin)|what should i do if.{0,40}scammed|1930|emergency)\b/.test(
      text,
    ) ||
    /मेरे साथ.{0,12}(?:धोख|ठगी)|(?:धोख|ठगी).{0,18}(?:हुई|शिकार|क्या कर|होने पर|अगर)|पैसे.{0,18}(?:कट|गए|खो)/.test(
      text,
    ) ||
    /আমার সঙ্গে.{0,12}প্রতার|প্রতার.{0,18}(?:হয়েছে|শিকার|কী কর|হলে|যদি)|টাকা.{0,18}(?:কেটেছে|গেছে|হারিয়েছে)/.test(
      text,
    )
  );
}

function localizedError(error: unknown, copy: (typeof COPY)[UiLanguage]) {
  if (error instanceof ApiError) {
    if (error.status === 0) return copy.networkError;
    if (error.status === 401) return copy.sessionExpired;
    if (error.status === 429) return copy.rateLimit;
    if (error.code === "AI_NOT_CONFIGURED") return copy.serviceNotConfigured;
    if (error.code === "AI_INVALID_CREDENTIALS") return copy.invalidAiCredentials;
    if (error.code === "AI_RATE_LIMITED") return copy.aiRateLimit;
    if (error.code === "AI_TIMEOUT") return copy.aiTimeout;
    if (error.status === 503) return copy.serviceNotConfigured;
    if (error.status >= 500) return copy.serviceFailure;
    if (error.status === 400) return copy.enterQuestion;
  }
  return copy.networkError;
}

function localizedSpeechError(error: unknown, copy: (typeof COPY)[UiLanguage]) {
  if (error instanceof ApiError) {
    if (error.status === 0) return copy.speechNetwork;
    if (error.status === 401) return copy.sessionExpired;
    if (error.code === "STT_MODEL_DOWNLOAD_FAILED") return copy.transcriptionDownloadFailed;
    if (error.code === "STT_MODEL_INIT" || error.code === "STT_MODEL_LOAD_FAILED")
      return copy.transcriptionModelInit;
    if (error.code === "STT_PYTHON_UNAVAILABLE") return copy.transcriptionPythonMissing;
    if (error.code === "STT_QUEUE_FULL") return copy.transcriptionQueueFull;
    if (error.code === "STT_INVALID_AUDIO" || error.code === "STT_UNSUPPORTED_AUDIO")
      return copy.transcriptionInvalidAudio;
    if (error.code === "STT_NO_SPEECH") return copy.transcriptionNoSpeech;
    if (error.code === "STT_SILENCE") return copy.transcriptionSilence;
    if (error.code === "STT_TRANSCRIPTION_FAILED") return copy.transcriptionFailed;
    if (error.code === "STT_NOT_CONFIGURED") return copy.transcriptionNotConfigured;
    if (error.code === "STT_REQUEST_LIMITED") return copy.transcriptionRequestLimit;
    if (error.code === "STT_TIMEOUT") return copy.transcriptionTimeout;
    if (error.code === "STT_NETWORK") return copy.speechNetwork;
    if (error.code === "STT_EMPTY_AUDIO") return copy.emptyRecording;
    if (error.code === "STT_UNSUPPORTED_AUDIO") return copy.micUnsupported;
    if (error.status === 429) return copy.transcriptionRequestLimit;
    return copy.speechService;
  }
  return copy.speechService;
}

function languageTag(language: UiLanguage) {
  return language === "hi" ? "hi-IN" : language === "bn" ? "bn-IN" : "en-IN";
}

function browserSpeechRecognitionSupported() {
  return (
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
}

function createBrowserSpeechRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  return Recognition ? new Recognition() : undefined;
}

function canOfferBrowserFallback(error: unknown) {
  if (!(error instanceof ApiError)) return true;
  if (error.status === 401 || error.status === 429) return false;
  return [
    "STT_MODEL_DOWNLOAD_FAILED",
    "STT_MODEL_INIT",
    "STT_MODEL_LOAD_FAILED",
    "STT_PYTHON_UNAVAILABLE",
    "STT_WORKER_UNAVAILABLE",
    "STT_WORKER_EXITED",
    "STT_NOT_CONFIGURED",
    "STT_TRANSCRIPTION_FAILED",
    "STT_TIMEOUT",
  ].includes(error.code ?? "");
}

function findVoice(language: UiLanguage): Promise<SpeechSynthesisVoice | undefined> {
  const synthesis = window.speechSynthesis;
  const matchingVoice = () =>
    synthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith(language));
  const existingVoice = matchingVoice();
  if (existingVoice) return Promise.resolve(existingVoice);

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      synthesis.removeEventListener("voiceschanged", onVoicesChanged);
      resolve(matchingVoice());
    }, 1200);
    const onVoicesChanged = () => {
      const voice = matchingVoice();
      if (!voice) return;
      window.clearTimeout(timeout);
      synthesis.removeEventListener("voiceschanged", onVoicesChanged);
      resolve(voice);
    };
    synthesis.addEventListener("voiceschanged", onVoicesChanged);
  });
}

export function VoiceAssistant() {
  const { settings, setSettings, isAuthenticated, authLoading, logout } = useApp();
  const navigate = useNavigate();
  const lang = settings.language;
  const copy = COPY[lang];
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [retryQuestion, setRetryQuestion] = useState("");
  const [suggestedPath, setSuggestedPath] = useState<AssistantPath>();
  const [voiceError, setVoiceError] = useState("");
  const [showBrowserFallback, setShowBrowserFallback] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const browserRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<number | null>(null);
  const microphoneRequestIdRef = useRef(0);
  const cancelledRecordersRef = useRef(new WeakSet<MediaRecorder>());
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef(lang);
  const copyRef = useRef(copy);
  languageRef.current = lang;
  copyRef.current = copy;

  const stopRecording = useCallback((cancel = false) => {
    if (cancel) {
      microphoneRequestIdRef.current += 1;
      if (recorderRef.current) cancelledRecordersRef.current.add(recorderRef.current);
      setStatus("idle");
    }
    if (recordingTimeoutRef.current !== null) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    const browserRecognition = browserRecognitionRef.current;
    if (browserRecognition) {
      if (cancel) {
        browserRecognitionRef.current = null;
        browserRecognition.abort();
        setStatus("idle");
      } else {
        browserRecognition.stop();
      }
      return;
    }
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") {
      if (!cancel) setStatus("transcribing");
      recorder.stop();
      return;
    }
    microphoneRequestIdRef.current += 1;
    microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
    microphoneStreamRef.current = null;
    recorderRef.current = null;
    setStatus("idle");
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
  }, [messages, status, open]);

  useEffect(() => {
    if (isAuthenticated) return;
    stopRecording(true);
    window.speechSynthesis?.cancel();
    setOpen(false);
    setMessages([]);
    setDraft("");
    setStatus("idle");
    setErrorMessage("");
    setRetryQuestion("");
  }, [isAuthenticated, stopRecording]);

  useEffect(
    () => () => {
      stopRecording(true);
      window.speechSynthesis?.cancel();
    },
    [stopRecording],
  );

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setStatus("idle");
  }, []);

  const closeAssistant = useCallback(() => {
    stopRecording(true);
    stopSpeaking();
    setStatus("idle");
    setOpen(false);
    if (isAuthenticated) triggerRef.current?.focus();
  }, [isAuthenticated, stopRecording, stopSpeaking]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAssistant();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeAssistant]);

  const speak = useCallback(
    async (text: string, language: UiLanguage = lang) => {
      setVoiceError("");
      if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
        setStatus("idle");
        setVoiceError(copyRef.current.voiceUnsupported);
        return;
      }
      const selectedLanguage = languageRef.current;
      const voice = await findVoice(language);
      if (!voice) {
        setStatus("idle");
        setVoiceError(copyRef.current.voiceUnsupported);
        return;
      }
      if (languageRef.current !== selectedLanguage) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = languageTag(language);
      utterance.voice = voice;
      utterance.onend = () => setStatus("idle");
      utterance.onerror = () => {
        setVoiceError(copyRef.current.voiceUnsupported);
        setStatus("idle");
      };
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        setStatus("speaking");
      } catch {
        setStatus("idle");
        setVoiceError(copyRef.current.voiceUnsupported);
      }
    },
    [lang],
  );

  const submitQuestion = useCallback(
    async (question: string, retry = false) => {
      const cleanQuestion = question.trim();
      if (!cleanQuestion) {
        setErrorMessage(copyRef.current.enterQuestion);
        return;
      }
      if (cleanQuestion.length > 1200) {
        setErrorMessage(copyRef.current.unavailable);
        return;
      }
      setErrorMessage("");
      setRetryQuestion("");
      setVoiceError("");
      setDraft("");
      setSuggestedPath(undefined);
      if (!retry) {
        setMessages((current) => [
          ...current,
          { role: "user", text: cleanQuestion, language: lang },
        ]);
      }
      setStatus("processing");

      const path = suggestedPathFor(cleanQuestion);
      if (path === "/emergency") {
        const responseLanguage = lang;
        setMessages((current) => [
          ...current,
          { role: "assistant", text: copyRef.current.emergencyAnswer, language: responseLanguage },
        ]);
        setSuggestedPath(path);
        setStatus("idle");
        return;
      }

      try {
        const responseLanguage = lang;
        const answer = await askAssistant(cleanQuestion, responseLanguage);
        setMessages((current) => [
          ...current,
          { role: "assistant", text: answer, language: responseLanguage },
        ]);
        setSuggestedPath(path);
        setStatus("idle");
      } catch (error) {
        setErrorMessage(localizedError(error, copyRef.current));
        setRetryQuestion(cleanQuestion);
        setStatus("idle");
        if (error instanceof ApiError && error.status === 401) {
          await logout().catch(() => undefined);
        }
      }
    },
    [lang, logout],
  );

  const startListening = useCallback(async () => {
    if (status === "listening" || status === "transcribing" || status === "processing") return;
    setVoiceError("");
    setShowBrowserFallback(false);
    setErrorMessage("");
    if (!window.isSecureContext) {
      setVoiceError(copyRef.current.insecureOrigin);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceError(copyRef.current.micUnsupported);
      return;
    }

    const requestId = ++microphoneRequestIdRef.current;
    setStatus("listening");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      if (microphoneRequestIdRef.current !== requestId) return;
      setStatus("idle");
      setVoiceError(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? copyRef.current.micDenied
          : error instanceof DOMException && error.name === "NotFoundError"
            ? copyRef.current.noMicrophone
            : error instanceof DOMException && error.name === "SecurityError"
              ? copyRef.current.insecureOrigin
              : copyRef.current.speechService,
      );
      return;
    }

    if (microphoneRequestIdRef.current !== requestId) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    const supportedMimeType =
      typeof MediaRecorder.isTypeSupported === "function"
        ? ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find(
            (type) => MediaRecorder.isTypeSupported(type),
          )
        : undefined;
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(
        stream,
        supportedMimeType ? { mimeType: supportedMimeType } : {},
      );
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      setStatus("idle");
      setVoiceError(copyRef.current.micUnsupported);
      return;
    }

    microphoneStreamRef.current = stream;
    recorderRef.current = recorder;
    audioChunksRef.current = [];
    const audioTrackSettings = stream.getAudioTracks()[0]?.getSettings();
    console.info("[ScamShield voice] Microphone ready", {
      sampleRate: audioTrackSettings?.sampleRate,
      channelCount: audioTrackSettings?.channelCount,
      echoCancellation: audioTrackSettings?.echoCancellation,
      noiseSuppression: audioTrackSettings?.noiseSuppression,
      autoGainControl: audioTrackSettings?.autoGainControl,
    });
    const recordingStartedAt = performance.now();
    let chunkCount = 0;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunkCount += 1;
        audioChunksRef.current.push(event.data);
      }
    };
    recorder.onerror = () => {
      if (recorderRef.current !== recorder) return;
      cancelledRecordersRef.current.add(recorder);
      if (recordingTimeoutRef.current !== null) {
        window.clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
      setStatus("idle");
      setVoiceError(copyRef.current.speechService);
      stream.getTracks().forEach((track) => track.stop());
      microphoneStreamRef.current = null;
      recorderRef.current = null;
      audioChunksRef.current = [];
    };
    recorder.onstop = () => {
      if (recordingTimeoutRef.current !== null) {
        window.clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
      if (recorderRef.current === recorder) recorderRef.current = null;
      stream.getTracks().forEach((track) => track.stop());
      if (microphoneStreamRef.current === stream) microphoneStreamRef.current = null;

      const chunks = audioChunksRef.current;
      audioChunksRef.current = [];
      if (cancelledRecordersRef.current.has(recorder)) return;

      const audio = new Blob(chunks, {
        type: recorder.mimeType || chunks[0]?.type || "audio/webm",
      });
      console.info("[ScamShield voice] Recording complete", {
        mimeType: audio.type,
        chunkCount,
        sizeBytes: audio.size,
        durationSeconds: Number(((performance.now() - recordingStartedAt) / 1000).toFixed(2)),
      });
      if (audio.size === 0) {
        setStatus("idle");
        setVoiceError(copyRef.current.emptyRecording);
        return;
      }
      if (audio.size > 10 * 1024 * 1024) {
        setStatus("idle");
        setVoiceError(copyRef.current.recordingTooLarge);
        return;
      }

      setStatus("transcribing");
      void transcribeAssistantAudio(audio, languageRef.current)
        .then((transcript) => {
          setDraft(transcript);
          setVoiceError("");
          setStatus("idle");
          inputRef.current?.focus();
        })
        .catch(async (error: unknown) => {
          setVoiceError(localizedSpeechError(error, copyRef.current));
          setShowBrowserFallback(
            canOfferBrowserFallback(error) && browserSpeechRecognitionSupported(),
          );
          setStatus("idle");
          if (error instanceof ApiError && error.status === 401) {
            await logout().catch(() => undefined);
          }
        });
    };

    try {
      recorder.start(1000);
      recordingTimeoutRef.current = window.setTimeout(() => stopRecording(), 60_000);
    } catch {
      recorderRef.current = null;
      microphoneStreamRef.current = null;
      stream.getTracks().forEach((track) => track.stop());
      setStatus("idle");
      setVoiceError(copyRef.current.speechService);
    }
  }, [logout, status, stopRecording]);

  const startBrowserFallback = useCallback(() => {
    setVoiceError("");
    setShowBrowserFallback(false);
    if (!window.isSecureContext) {
      setVoiceError(copyRef.current.insecureOrigin);
      return;
    }
    const recognition = createBrowserSpeechRecognition();
    if (!recognition) {
      setVoiceError(copyRef.current.micUnsupported);
      return;
    }

    recognition.lang = languageTag(languageRef.current);
    recognition.interimResults = true;
    recognition.continuous = false;
    let finalTranscript = "";
    recognition.onresult = (event) => {
      let interimTranscript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result) continue;
        if (result.isFinal) finalTranscript += result[0]?.transcript ?? "";
        else interimTranscript += result[0]?.transcript ?? "";
      }
      setDraft(`${finalTranscript}${interimTranscript}`.trim());
    };
    recognition.onerror = (event) => {
      if (browserRecognitionRef.current !== recognition) return;
      browserRecognitionRef.current = null;
      setStatus("idle");
      setVoiceError(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? copyRef.current.micDenied
          : event.error === "network"
            ? copyRef.current.speechNetwork
            : event.error === "no-speech"
              ? copyRef.current.noSpeech
              : copyRef.current.speechService,
      );
    };
    recognition.onend = () => {
      if (browserRecognitionRef.current !== recognition) return;
      browserRecognitionRef.current = null;
      setStatus("idle");
      if (!finalTranscript.trim()) {
        setVoiceError(copyRef.current.noSpeech);
      } else {
        setDraft(finalTranscript.trim());
        inputRef.current?.focus();
      }
    };

    browserRecognitionRef.current = recognition;
    setStatus("listening");
    try {
      recognition.start();
    } catch {
      browserRecognitionRef.current = null;
      setStatus("idle");
      setVoiceError(copyRef.current.speechService);
    }
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitQuestion(draft);
  }

  function askSuggestion(question: string) {
    void submitQuestion(question);
  }

  function openSuggestedPage() {
    if (!suggestedPath) return;
    const to = suggestedPath;
    closeAssistant();
    void navigate({ to });
  }

  const isBusy = status === "processing" || status === "listening" || status === "transcribing";
  const statusText =
    status === "listening"
      ? copy.listening
      : status === "transcribing"
        ? copy.transcribing
        : status === "processing"
          ? copy.processing
          : status === "speaking"
            ? copy.speaking
            : copy.ready;

  if (authLoading || !isAuthenticated) return null;

  return (
    <div className="ss-assistant">
      {open && (
        <section
          id="ss-voice-assistant-panel"
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-labelledby="ss-assistant-title"
          className="ss-assistant-panel"
        >
          <header className="ss-assistant-header">
            <span className="ss-assistant-avatar" aria-hidden="true">
              <Bot size={23} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="ss-assistant-title" className="ss-assistant-title">
                {copy.title}
              </h2>
              <p className="ss-assistant-status" aria-live="polite">
                {status === "speaking" && (
                  <span className="ss-assistant-speaking-dots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                )}
                {statusText}
              </p>
            </div>
            <button
              type="button"
              onClick={closeAssistant}
              aria-label={copy.close}
              className="ss-assistant-icon-button"
            >
              <X size={22} />
            </button>
          </header>

          <label className="ss-assistant-language">
            <span>{copy.language}</span>
            <select
              value={lang}
              onChange={(event) => {
                stopSpeaking();
                const nextLanguage = event.target.value as UiLanguage;
                languageRef.current = nextLanguage;
                setSettings({ language: nextLanguage });
              }}
              aria-label={copy.language}
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="bn">বাংলা</option>
            </select>
          </label>

          <div
            ref={messagesRef}
            className="ss-assistant-messages"
            aria-label={copy.title}
            aria-live="polite"
            aria-relevant="additions text"
          >
            <div className="ss-assistant-message ss-assistant-message-bot">
              <p>{copy.welcome}</p>
              <p className="mt-1 text-sm opacity-80">{copy.intro}</p>
            </div>
            {messages.map((message, index) => (
              <div
                key={`${index}-${message.role}`}
                className={`ss-assistant-message ${message.role === "user" ? "ss-assistant-message-user" : "ss-assistant-message-bot"}`}
              >
                {message.role === "assistant" ? (
                  <div className="ss-assistant-message-content">
                    <p className="whitespace-pre-wrap">{message.text}</p>
                    <button
                      type="button"
                      onClick={() => void speak(message.text, message.language)}
                      className="ss-assistant-speaker-button"
                      aria-label={copy.speakResponse}
                      title={copy.speakResponse}
                    >
                      <Volume2 size={17} />
                    </button>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.text}</p>
                )}
              </div>
            ))}
            {messages.length === 0 && (
              <div className="ss-assistant-suggestions">
                <button type="button" onClick={() => askSuggestion(copy.suggestion)}>
                  {copy.suggestion}
                </button>
                <button type="button" onClick={() => askSuggestion(copy.suggestionEmergency)}>
                  {copy.suggestionEmergency}
                </button>
              </div>
            )}
            {status === "processing" && (
              <div className="ss-assistant-message ss-assistant-message-bot" role="status">
                <LoaderCircle size={18} className="animate-spin" />
                <span>{copy.processing}</span>
              </div>
            )}
            {suggestedPath && (
              <button type="button" onClick={openSuggestedPage} className="ss-assistant-link">
                {suggestedPath === "/emergency" ? copy.emergencyCta : copy.openPage}
                <ArrowUpRight size={17} />
              </button>
            )}
            {errorMessage && (
              <div className="ss-assistant-error" role="alert">
                <p>{errorMessage}</p>
                {retryQuestion && (
                  <button
                    type="button"
                    onClick={() => void submitQuestion(retryQuestion, true)}
                    disabled={status === "processing"}
                    className="ss-assistant-audio-control mt-2"
                  >
                    {copy.retry}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="ss-assistant-footer">
            <p className="ss-assistant-privacy">{copy.privacy}</p>
            {(voiceError ||
              status === "listening" ||
              status === "transcribing" ||
              status === "speaking") && (
              <div className="ss-assistant-audio-row">
                {voiceError && (
                  <div className="ss-assistant-error" role="status">
                    <p>{voiceError}</p>
                    {showBrowserFallback && browserSpeechRecognitionSupported() && (
                      <>
                        <button
                          type="button"
                          onClick={startBrowserFallback}
                          className="ss-assistant-audio-control mt-2"
                        >
                          <Mic size={18} /> {copy.browserFallback}
                        </button>
                        <p className="mt-2 text-xs">{copy.browserFallbackNotice}</p>
                      </>
                    )}
                  </div>
                )}
                {status === "listening" && (
                  <button
                    type="button"
                    onClick={() => stopRecording()}
                    className="ss-assistant-audio-control"
                  >
                    <MicOff size={18} /> {copy.stopListening}
                  </button>
                )}
                {status === "speaking" && (
                  <button
                    type="button"
                    onClick={stopSpeaking}
                    className="ss-assistant-audio-control"
                  >
                    <VolumeX size={18} /> {copy.stopSpeaking}
                  </button>
                )}
              </div>
            )}
            <form onSubmit={handleSubmit} className="ss-assistant-form">
              <button
                type="button"
                onClick={() => {
                  if (status === "listening") browserRecognitionRef.current?.stop();
                  else startBrowserFallback();
                }}
                disabled={status === "processing" || status === "transcribing"}
                aria-label={status === "listening" ? copy.stopListening : copy.listen}
                title={status === "listening" ? copy.stopListening : copy.listen}
                className={`ss-assistant-control-button ${status === "listening" ? "ss-assistant-mic-active" : ""}`}
              >
                {status === "listening" ? <MicOff size={21} /> : <Mic size={21} />}
              </button>
              <textarea
                ref={inputRef}
                rows={1}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submitQuestion(draft);
                  }
                }}
                maxLength={1200}
                placeholder={copy.placeholder}
                aria-label={copy.placeholder}
                className="ss-assistant-input"
              />
              <button
                type="submit"
                disabled={isBusy || !draft.trim()}
                aria-label={copy.send}
                title={copy.send}
                className="ss-assistant-control-button ss-assistant-send"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </section>
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (open) closeAssistant();
          else setOpen(true);
        }}
        aria-label={open ? copy.close : copy.open}
        aria-expanded={open}
        aria-controls="ss-voice-assistant-panel"
        className={`ss-assistant-launcher ${status === "listening" || status === "speaking" ? "ss-assistant-launcher-active" : ""}`}
      >
        {open ? (
          <X size={25} />
        ) : status === "listening" ? (
          <Mic size={25} />
        ) : (
          <AudioLines size={25} />
        )}
        <span className="sr-only">{copy.open}</span>
      </button>
    </div>
  );
}
