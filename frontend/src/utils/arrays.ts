export function updateAt<T>(
  arr: T[],
  idx: number,
  updater: (item: T) => T,
): T[] {
  return arr.map((item, i) => (i === idx ? updater(item) : item));
}

export function removeAt<T>(arr: T[], idx: number): T[] {
  return arr.filter((_, i) => i !== idx);
}

export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
