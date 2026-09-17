let simulatedNow = null;

function getNow() {
  return simulatedNow ? new Date(simulatedNow.getTime()) : new Date();
}

function setClock(setTo) {
  const parsed = new Date(setTo);
  if (Number.isNaN(parsed.getTime())) throw new Error('setTo must be a valid ISO date');
  simulatedNow = parsed;
  return getNow();
}

function advanceClock(days) {
  const amount = Number(days);
  if (!Number.isFinite(amount)) throw new Error('advanceDays must be a number');
  simulatedNow = new Date(getNow().getTime() + amount * 86400000);
  return getNow();
}

function resetClock() {
  simulatedNow = null;
}

module.exports = { getNow, setClock, advanceClock, resetClock };
