// Prototype-only rule engine.
// This is NOT a veterinary diagnosis. Replace with a validated model/ruleset.

const highRisk = ["fever", "severe skin lesion", "skin problem", "loss of appetite", "swelling", "difficulty breathing"];
const mediumRisk = ["cough", "weakness", "reduced milk production", "diarrhea"];

function calculateRisk(symptoms = []) {
  const normalized = symptoms.map(s => String(s).trim().toLowerCase());

  let score = 0;
  const possibleRisks = [];

  normalized.forEach(s => {
    if (highRisk.includes(s)) score += 25;
    else if (mediumRisk.includes(s)) score += 12;
    else if (s) score += 5;
  });

  if (normalized.includes("skin problem") || normalized.includes("severe skin lesion")) {
    possibleRisks.push("Skin-related infection risk");
  }
  if (normalized.includes("fever") && normalized.includes("loss of appetite")) {
    possibleRisks.push("Systemic illness risk");
  }
  if (normalized.includes("cough") || normalized.includes("difficulty breathing")) {
    possibleRisks.push("Respiratory illness risk");
  }
  if (!possibleRisks.length) possibleRisks.push("General health concern");

  const finalScore = Math.min(score, 100);
  const riskLevel = finalScore >= 50 ? "High" : finalScore >= 25 ? "Medium" : "Low";

  return {
    riskScore: finalScore,
    riskLevel,
    possibleRisks,
    recommendation:
      riskLevel === "High"
        ? "Contact a veterinarian promptly and isolate the animal if advised by the veterinarian."
        : riskLevel === "Medium"
        ? "Monitor the animal closely and consider veterinary consultation."
        : "Continue preventive care and monitor for new symptoms."
  };
}

module.exports = { calculateRisk };
