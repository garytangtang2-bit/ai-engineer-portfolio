export function compareRuns(runs) {
  if (!Array.isArray(runs) || !runs.length) throw new Error('請提供至少一筆 runs 紀錄。');
  const cases = new Map();
  for (const run of runs) {
    if (!run || typeof run.caseId !== 'string' || !run.caseId.trim()) throw new Error('每筆紀錄需要 caseId。');
    const id = run.caseId.trim();
    if (!['before', 'after'].includes(run.version)) throw new Error(id + ' 的 version 必須是 before 或 after。');
    for (const key of ['inputTokens', 'outputTokens']) {
      if (!Number.isSafeInteger(run[key]) || run[key] < 0) throw new Error(id + ' 的 ' + key + ' 必須是非負整數。');
    }
    if (![true, false, null].includes(run.accepted)) throw new Error(id + ' 的 accepted 必須是 true、false 或 null。');
    const pair = cases.get(id) || { caseId: id };
    if (pair[run.version]) throw new Error(id + ' 有重複版本。請先加總同一輪的所有呼叫。');
    pair[run.version] = run;
    cases.set(id, pair);
  }
  return Array.from(cases.values(), pair => {
    const total = run => {
      if (!run) return null;
      const value = run.inputTokens + run.outputTokens;
      if (!Number.isSafeInteger(value)) throw new Error('Token 總數超出可精確比較範圍。');
      return value;
    };
    const before = total(pair.before);
    const after = total(pair.after);
    let status = 'accepted';
    if (!pair.before || !pair.after) status = 'unpaired';
    else if (pair.before.accepted !== true || pair.after.accepted !== true) status = 'review';
    return { caseId: pair.caseId, before, after, status };
  });
}

export function summarizePairs(pairs) {
  let before = 0;
  let after = 0;
  let accepted = 0;
  for (const pair of pairs) {
    if (pair.status !== 'accepted') continue;
    before += pair.before;
    after += pair.after;
    accepted++;
  }
  if (!Number.isSafeInteger(before) || !Number.isSafeInteger(after)) throw new Error('批次總數超出可精確比較範圍。');
  return { accepted, pending: pairs.length - accepted, before, after, savedTokens: before - after,
    reductionPercent: before ? Math.round((1 - after / before) * 1000) / 10 : null, pairs };
}
