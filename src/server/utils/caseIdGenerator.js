const Counter = require('../models/Counter');
const Issue = require('../models/Issue');

const generateCaseId = async () => {
  const currentYear = new Date().getFullYear();
  const counterName = `caseId_${currentYear}`;

  let attempts = 0;
  while (attempts < 20) {
    attempts++;
    const counter = await Counter.findOneAndUpdate(
      { name: counterName },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const paddedNumber = String(counter.seq).padStart(6, '0');
    const candidateId = `CT-${currentYear}-${paddedNumber}`;

    // Verify uniqueness
    const existing = await Issue.findOne({ caseId: candidateId });
    if (!existing) {
      return candidateId;
    }
  }

  // Fallback if needed
  return `CT-${currentYear}-${Date.now().toString().slice(-6)}`;
};

module.exports = { generateCaseId };
