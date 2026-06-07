const asInteger = (value: number) => {
  const fraction = value - Math.trunc(value);
  if (fraction === 0.5) {
    return Math.trunc(value) + 1;
  }

  return Math.round(value);
};

export const toRupees = (value: number) => asInteger(Number.isFinite(value) ? value : 0);

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(toRupees(value));

export const computeEqualShares = (total: number, count: number) => {
  if (count <= 0) {
    return [];
  }

  const base = Math.floor(total / count);
  const remainder = total - base * count;

  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
};

export const apportionByWeights = (total: number, weights: number[]) => {
  const weightSum = weights.reduce((sum, value) => sum + value, 0);
  if (weightSum <= 0) {
    return weights.map(() => 0);
  }

  const exact = weights.map((weight) => (total * weight) / weightSum);
  const base = exact.map((value) => Math.floor(value));
  let remaining = total - base.reduce((sum, value) => sum + value, 0);

  const ranking = exact
    .map((value, index) => ({
      index,
      fraction: value - Math.floor(value)
    }))
    .sort((left, right) => right.fraction - left.fraction);

  let rankIndex = 0;
  while (remaining > 0 && ranking.length > 0) {
    base[ranking[rankIndex % ranking.length].index] += 1;
    remaining -= 1;
    rankIndex += 1;
  }

  return base;
};
