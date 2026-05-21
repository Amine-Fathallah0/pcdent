const pad2 = (value: number) => String(value).padStart(2, '0');

export const parseBackendDateTime = (value: string): Date => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) {
    return new Date(value);
  }
  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    second ? Number(second) : 0,
    0,
  );
};

export const toLocalDateInputValue = (value: Date): string => {
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
};

export const toLocalTimeInputValue = (value: Date): string => {
  return `${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
};
