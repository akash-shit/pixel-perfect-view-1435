const BRANDS = [
  { name: "SBI", aliases: ["sbi", "state bank of india"], domains: ["sbi.co.in", "onlinesbi.sbi", "bank.sbi"] },
  { name: "HDFC Bank", aliases: ["hdfc", "hdfc bank"], domains: ["hdfcbank.com"] },
  { name: "ICICI Bank", aliases: ["icici", "icici bank"], domains: ["icicibank.com"] },
  { name: "Axis Bank", aliases: ["axis bank"], domains: ["axisbank.com"] },
  { name: "RBI", aliases: ["rbi", "reserve bank of india"], domains: ["rbi.org.in"] },
  { name: "Income Tax", aliases: ["income tax", "income-tax department"], domains: ["incometax.gov.in"] },
  { name: "UPI", aliases: ["upi", "npci"], domains: ["npci.org.in"] },
  { name: "PayPal", aliases: ["paypal"], domains: ["paypal.com"] },
  { name: "Google", aliases: ["google", "gpay", "google pay"], domains: ["google.com", "pay.google.com"] },
  { name: "Microsoft", aliases: ["microsoft"], domains: ["microsoft.com"] },
  { name: "Apple", aliases: ["apple", "apple support"], domains: ["apple.com"] },
  { name: "WhatsApp", aliases: ["whatsapp"], domains: ["whatsapp.com"] },
  { name: "Amazon", aliases: ["amazon"], domains: ["amazon.in", "amazon.com"] },
  { name: "Flipkart", aliases: ["flipkart"], domains: ["flipkart.com"] },
  { name: "PhonePe", aliases: ["phonepe", "phone pe"], domains: ["phonepe.com"] },
  { name: "Paytm", aliases: ["paytm"], domains: ["paytm.com"] },
  { name: "India Post", aliases: ["india post", "post office"], domains: ["indiapost.gov.in"] },
  { name: "Blue Dart", aliases: ["blue dart", "bluedart"], domains: ["bluedart.com"] },
  { name: "FedEx", aliases: ["fedex"], domains: ["fedex.com"] },
  { name: "Airtel", aliases: ["airtel"], domains: ["airtel.in"] },
  { name: "Jio", aliases: ["jio", "reliance jio"], domains: ["jio.com"] },
];

const SHORTENER_HOSTS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "rb.gy",
  "cutt.ly",
  "is.gd",
  "shorturl.at",
  "goo.gl",
  "tiny.cc",
]);

const DOMAIN_RISK_TERMS = new Set(["account", "bank", "claim", "login", "payment", "refund", "secure", "support", "verify", "kyc"]);
const CONFUSABLES = { "0": "o", "1": "l", "5": "s", "8": "b" };

function visualSkeleton(value) {
  return value.toLowerCase().replace(/[0158]/g, (character) => CONFUSABLES[character]);
}

function editDistance(left, right) {
  const row = Array.from({ length: right.length + 1 }, (_value, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previous = row[0];
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = row[rightIndex];
      row[rightIndex] = Math.min(
        row[rightIndex] + 1,
        row[rightIndex - 1] + 1,
        previous + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      previous = above;
    }
  }
  return row[right.length];
}

function findLookalikeBrand(hostname) {
  if (BRANDS.some((brand) => brand.domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`)))) {
    return "";
  }
  const labels = hostname.split(".").flatMap((label) => label.split("-"));
  for (const brand of BRANDS) {
    for (const domain of brand.domains) {
      const officialLabel = domain.split(".")[0];
      if (labels.some((label) => visualSkeleton(label) === officialLabel)) return brand.name;
      if (officialLabel.length >= 5 && labels.some((label) => editDistance(visualSkeleton(label), officialLabel) === 1)) {
        return brand.name;
      }
    }
  }
  return "";
}

export function findBrandDomainMismatch(text, urlAnalysis) {
  const lowerText = String(text || "").toLowerCase();
  for (const brand of BRANDS) {
    if (!brand.aliases.some((alias) => lowerText.includes(alias))) continue;
    const mismatchedUrl = urlAnalysis.find(({ domain }) =>
      domain && !brand.domains.some((officialDomain) => domain === officialDomain || domain.endsWith(`.${officialDomain}`)),
    );
    if (mismatchedUrl) return { brand: brand.name, url: mismatchedUrl.url, domain: mismatchedUrl.domain };
  }

  const signature = String(text || "").split(/\b(?:regards|sincerely|best regards)\b/i).at(-1) || "";
  const signatureLines = signature.split(/\r?\n/).map((line) => line.trim().replace(/[,.]+$/, "")).filter(Boolean);
  const signatureLine = signatureLines.at(-1) || "";
  const organization = signatureLine
    .replace(/\s+(?:(?:online|banking|customer|financial|technical)\s+)*(?:security|support|customer service|helpdesk)\s+team$/i, "")
    .trim();
  if (/\b(?:bank|banking|finance|financial|insurance|telecom|payments?|credit union)\b/i.test(organization)) {
    const domain = urlAnalysis.find((entry) => entry.domain)?.domain || "";
    if (domain) {
      const domainLabels = domain.toLowerCase().replace(/^www\./, "").split(".").slice(0, -1).join(" ").split(/[^a-z0-9]+/).filter(Boolean);
      const organizationTokens = organization.toLowerCase().split(/[^a-z0-9]+/).filter((token) =>
        token.length >= 3 && !["bank", "banking", "finance", "financial", "insurance", "telecom", "payment", "payments", "security", "support", "customer", "online", "team"].includes(token),
      );
      if (organizationTokens.length && !organizationTokens.some((token) => domainLabels.includes(token))) {
        const mismatchedUrl = urlAnalysis.find((entry) => entry.domain === domain);
        return { brand: organization, url: mismatchedUrl.url, domain };
      }
    }
  }
  return null;
}

const SUSPICIOUS_PATH_HINTS = [
  "login",
  "verify",
  "kyc",
  "secure",
  "update",
  "otp",
  "account",
  "payment",
  "refund",
  "claim",
  "win",
  "cashback",
  "install",
  "download",
  "signin",
  "auth",
];

const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"']+|\b[a-z0-9][a-z0-9.-]*\.(?:[a-z]{2,63})(?:\/[^\s<>"']*)?/gi;

export function extractUrls(text = "") {
  if (!text || typeof text !== "string") return [];
  const matches = (text.match(URL_PATTERN) || []).map((value) => value.trim()).filter(Boolean);
  return [...new Set(matches)];
}

export function normalizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const value = rawUrl.trim().replace(/[),.;]+$/, "");
  if (!value) return null;

  if (/^https?:\/\//i.test(value)) return value;
  if (/^www\./i.test(value)) return `https://${value}`;
  if (/^[a-z0-9.-]+\.[a-z]{2,63}(?:\/.*)?$/i.test(value)) return `https://${value}`;
  return value.includes("/") || value.includes(".") ? `https://${value}` : null;
}

export function analyzeUrlString(rawUrl) {
  const normalized = normalizeUrl(rawUrl);
  if (!normalized) {
    return {
      url: rawUrl,
      domain: "",
      suspicious: false,
      reasons: ["No usable URL was detected."],
    };
  }

  try {
    const parsed = new URL(normalized);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const domain = hostname;
    const reasons = [];
    const signals = [];
    let suspicious = false;

    if (parsed.protocol === "http:") {
      signals.push("unencrypted_http");
      reasons.push("The link uses HTTP instead of HTTPS.");
    }
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      suspicious = true;
      signals.push("ip_address_host");
      reasons.push("The host is an IP address rather than a normal website domain.");
    }
    if (SHORTENER_HOSTS.has(hostname)) {
      suspicious = true;
      signals.push("url_shortener");
      reasons.push("The link uses a URL shortener that hides the real destination.");
    }
    if (hostname.split(".").some((label) => label.startsWith("xn--"))) {
      suspicious = true;
      signals.push("punycode_domain");
      reasons.push("The domain uses encoded characters that can hide a lookalike name.");
    }
    const labels = hostname.split(".").filter(Boolean);
    const hasExcessiveSubdomains = labels.length > 4;
    if (hasExcessiveSubdomains) {
      suspicious = true;
      signals.push("excessive_subdomains");
      reasons.push("The URL has an unusually deep subdomain structure.");
    }
    const lookalikeBrand = findLookalikeBrand(hostname);
    if (lookalikeBrand) {
      suspicious = true;
      signals.push("lookalike_domain");
      reasons.push(`The domain resembles ${lookalikeBrand} but is not on its official domain.`);
    }
    const hostRiskTerms = [...DOMAIN_RISK_TERMS].filter((term) => hostname.includes(term));
    const hasRiskyDomainCombination = hostRiskTerms.length >= 3 || (hostRiskTerms.length >= 2 && hostname.includes("-"));
    if (hasRiskyDomainCombination) {
      suspicious = true;
      signals.push("deceptive_domain_terms");
      reasons.push("The domain combines multiple account, payment, or verification terms.");
    }

    const lowerPath = `${parsed.pathname} ${parsed.search}`.toLowerCase();
    if (SUSPICIOUS_PATH_HINTS.some((hint) => lowerPath.includes(hint))) {
      signals.push("sensitive_url_path");
      reasons.push("The URL path mentions sign-in, payment, or verification; this alone does not prove the site is unsafe.");
    }
    if ([...parsed.searchParams.keys()].some((key) => /^(?:redirect|redirect_url|next|continue|return|target|url)$/i.test(key))) {
      signals.push("redirect_parameter");
      reasons.push("The URL includes a parameter that may redirect to another destination.");
    }

    return {
      url: normalized,
      domain,
      suspicious,
      lookalikeBrand,
      signals,
      reasons: reasons.length ? reasons : ["No obvious URL risk indicators were found in this link."],
    };
  } catch {
    return {
      url: normalized,
      domain: "",
      suspicious: true,
      reasons: ["The URL could not be parsed cleanly, so its destination could not be fully verified."],
    };
  }
}

export function analyzeUrlsInText(text = "") {
  return extractUrls(text).map((url) => analyzeUrlString(url));
}
