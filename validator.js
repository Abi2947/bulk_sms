/**
 * Nepal mobile network prefix map (NTA allocation).
 *
 * Nepal numbers are 10 digits locally (e.g. 98XXXXXXXX).
 * With country code: +977-98XXXXXXXX
 *
 * Prefixes are matched longest-first for greedy accuracy.
 */
const PREFIX_MAP = {
  // ── NTC (Nepal Telecom) — GSM / 4G 
  "984":  "NTC",
  "985":  "NTC",
  "986":  "NTC",  // NTC CDMA / WiMAX range
  "974":  "NTC",  // NTC landline-to-mobile bridge numbers

  // ── Ncell (Axiata)
  "980":  "Ncell",
  "981":  "Ncell",
  "982":  "Ncell",

  // ── Smart Telecom 
  "961":  "Smart Telecom",
  "962":  "Smart Telecom",
  "988":  "Smart Telecom",

  // ── UTL (United Telecom) — CDMA 
  "972":  "UTL",

  // ── Sky Mobile / Hello Mobile
  "963":  "Sky/Hello Mobile",
};

// Sorted prefixes longest-first for greedy matching
const SORTED_PREFIXES = Object.keys(PREFIX_MAP).sort(
  (a, b) => b.length - a.length
);

/**
 * Normalise a Nepali phone number to a bare 10-digit local format.
 *
 * Handles:
 *   +97798XXXXXXXX  →  98XXXXXXXX
 *    97798XXXXXXXX  →  98XXXXXXXX
 *      98XXXXXXXX   →  98XXXXXXXX  (already local)
 */
function normalise(number) {
  const digits = number.replace(/[\s\-().+]/g, "");

  // +977 or 977 prefix
  if (/^(?:\+?977)(\d{10})$/.test(digits)) {
    return digits.replace(/^\+?977/, "");
  }

  return digits;
}

/**
 * validateAndDetectNetwork(rawNumber)
 *
 * Returns { valid: true,  network: "Ncell", normalised: "9801234567" }
 *      or { valid: false, error: "..." }
 */
function validateAndDetectNetwork(rawNumber) {
  if (typeof rawNumber !== "string" || rawNumber.trim() === "") {
    return { valid: false, error: "Phone number must be a non-empty string" };
  }

  const normalised = normalise(rawNumber.trim());

  // Digits only after normalisation
  if (!/^\d+$/.test(normalised)) {
    return {
      valid: false,
      error: `Phone number contains invalid characters: "${rawNumber}"`,
    };
  }

  // Nepal local numbers are exactly 10 digits (98XXXXXXXX)
  if (normalised.length !== 10) {
    return {
      valid: false,
      error: `Nepali phone numbers must be 10 digits (got ${normalised.length}). Example: 9801234567`,
    };
  }

  // Must start with 9 (all Nepal mobile prefixes begin with 9)
  if (!normalised.startsWith("9")) {
    return {
      valid: false,
      error: `"${rawNumber}" does not look like a valid Nepali mobile number`,
    };
  }

  // Greedy prefix match
  for (const prefix of SORTED_PREFIXES) {
    if (normalised.startsWith(prefix)) {
      return { valid: true, network: PREFIX_MAP[prefix], normalised };
    }
  }

  return {
    valid: false,
    error: `Unable to detect network for "${rawNumber}". Unrecognised Nepali prefix.`,
  };
}

module.exports = { validateAndDetectNetwork };