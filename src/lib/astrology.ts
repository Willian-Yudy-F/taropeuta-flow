/**
 * Sun sign from date of birth (tropical zodiac, standard boundary dates).
 * NOTE: Moon and Rising signs require ephemeris calculations with exact
 * birth time + geographic coordinates. This project intentionally does NOT
 * fake those: the fields exist in the database and CRM for manual entry or
 * a future verified astrology library/API integration.
 */
const SIGNS: Array<{ sign: string; pt: string; from: [number, number] }> = [
  { sign: "Capricorn", pt: "Capricórnio", from: [12, 22] },
  { sign: "Sagittarius", pt: "Sagitário", from: [11, 22] },
  { sign: "Scorpio", pt: "Escorpião", from: [10, 23] },
  { sign: "Libra", pt: "Libra", from: [9, 23] },
  { sign: "Virgo", pt: "Virgem", from: [8, 23] },
  { sign: "Leo", pt: "Leão", from: [7, 23] },
  { sign: "Cancer", pt: "Câncer", from: [6, 21] },
  { sign: "Gemini", pt: "Gêmeos", from: [5, 21] },
  { sign: "Taurus", pt: "Touro", from: [4, 20] },
  { sign: "Aries", pt: "Áries", from: [3, 21] },
  { sign: "Pisces", pt: "Peixes", from: [2, 19] },
  { sign: "Aquarius", pt: "Aquário", from: [1, 20] },
];

export function sunSign(dateOfBirth: string): string | null {
  const d = new Date(dateOfBirth + "T00:00:00Z");
  if (isNaN(d.getTime())) return null;
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  for (const s of SIGNS) {
    const [fm, fd] = s.from;
    if (m === fm && day >= fd) return s.sign;
  }
  // before Jan 20 → Capricorn
  if (m === 1) return "Capricorn";
  // fallback: previous sign block
  const idx = SIGNS.findIndex((s) => s.from[0] === m);
  return idx >= 0 ? SIGNS[(idx + 1) % 12].sign : null;
}
