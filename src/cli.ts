export type CliOptions = {
  page?: number;
  limit?: number;
};

export function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (const arg of argv) {
    const [key, value] = arg.split("=");

    if (!value) {
      continue;
    }

    if (key === "--page") {
      options.page = parsePositiveInteger(value, "page");
    }

    if (key === "--limit") {
      options.limit = parsePositiveInteger(value, "limit");
    }
  }

  return options;
}

function parsePositiveInteger(value: string, name: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}
