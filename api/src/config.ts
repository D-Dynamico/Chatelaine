import { z } from 'zod';

/**
 * Environment parsed once at boot. A bad value stops the process with every problem listed,
 * instead of surfacing later as a confusing runtime failure.
 */

const STORAGE_KINDS = ['file', 'mongo', 'dynamo'] as const;
const NODE_ENVS = ['development', 'test', 'production'] as const;
const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

const DURATION_PATTERN = /^(\d+)([smh])$/;
const SECONDS_PER_UNIT: Readonly<Record<string, number>> = { s: 1, m: 60, h: 3600 };
const MIN_SECRET_LENGTH = 32;
/** The value shipped in .env.example. Fine on a laptop, never in production. */
const PLACEHOLDER_SECRET = 'replace-with-a-long-random-string';
const MAX_PROXY_HOPS = 10;

export type StorageKind = (typeof STORAGE_KINDS)[number];

export type StorageConfig =
  | { readonly kind: 'file'; readonly dataFile: string }
  | { readonly kind: 'mongo'; readonly uri: string; readonly dbName: string }
  | {
      readonly kind: 'dynamo';
      readonly endpoint: string | undefined;
      readonly region: string;
      readonly table: string;
    };

export interface Config {
  readonly port: number;
  readonly env: (typeof NODE_ENVS)[number];
  readonly logLevel: (typeof LOG_LEVELS)[number];
  readonly storage: StorageConfig;
  readonly jwt: { readonly secret: string; readonly ttlSeconds: number };
  readonly corsOrigins: readonly string[];
  /** Express "trust proxy" hop count; false when the API is reached directly. */
  readonly trustProxy: number | false;
  readonly simulationEnabled: boolean;
}

export class ConfigError extends Error {
  override readonly name = 'ConfigError';
}

const durationSeconds = z
  .string()
  .regex(DURATION_PATTERN, 'use a number and a unit, such as 2h, 30m or 900s')
  .transform((value) => {
    const [, amount = '', unit = ''] = DURATION_PATTERN.exec(value) ?? [];
    return Number(amount) * (SECONDS_PER_UNIT[unit] ?? 0);
  })
  .pipe(z.number().int().positive());

const originList = z
  .string()
  .transform((value) => value.split(',').map((origin) => origin.trim()))
  .pipe(z.array(z.url({ protocol: /^https?$/ })).min(1));

// Accepts only "true" and "false". z.coerce.boolean() would read "false" as true.
const strictBoolean = z.stringbool({ truthy: ['true'], falsy: ['false'] });

const envSchema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    NODE_ENV: z.enum(NODE_ENVS).default('development'),
    LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
    STORAGE: z.enum(STORAGE_KINDS).default('file'),
    DATA_FILE: z.string().default('data/chatelaine.xml'),
    MONGO_URI: z.string().optional(),
    MONGO_DB: z.string().default('chatelaine'),
    DYNAMO_ENDPOINT: z.url().optional(),
    DYNAMO_REGION: z.string().optional(),
    DYNAMO_TABLE: z.string().default('chatelaine'),
    JWT_SECRET: z.string().min(MIN_SECRET_LENGTH),
    JWT_TTL: durationSeconds.default(7200),
    CORS_ORIGIN: originList,
    TRUST_PROXY: z.coerce.number().int().min(0).max(MAX_PROXY_HOPS).optional(),
    SIMULATION_ENABLED: strictBoolean.default(true),
  })
  .superRefine((env, ctx) => {
    if (env.STORAGE === 'mongo' && !env.MONGO_URI) {
      ctx.addIssue({ code: 'custom', path: ['MONGO_URI'], message: 'required when STORAGE=mongo' });
    }
    if (env.STORAGE === 'dynamo' && !env.DYNAMO_REGION) {
      ctx.addIssue({
        code: 'custom',
        path: ['DYNAMO_REGION'],
        message: 'required when STORAGE=dynamo',
      });
    }
    if (env.NODE_ENV === 'production' && env.JWT_SECRET === PLACEHOLDER_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message: 'still the .env.example placeholder; generate a real secret for production',
      });
    }
  });

type ParsedEnv = z.infer<typeof envSchema>;

function toStorage(env: ParsedEnv): StorageConfig {
  switch (env.STORAGE) {
    case 'file':
      return { kind: 'file', dataFile: env.DATA_FILE };
    case 'mongo':
      // superRefine has already rejected a missing URI for this storage kind.
      return { kind: 'mongo', uri: env.MONGO_URI ?? '', dbName: env.MONGO_DB };
    case 'dynamo':
      return {
        kind: 'dynamo',
        endpoint: env.DYNAMO_ENDPOINT,
        region: env.DYNAMO_REGION ?? '',
        table: env.DYNAMO_TABLE,
      };
  }
}

/** `KEY=` in a .env file means "not set", not "set to an empty string". */
function withoutEmptyValues(
  source: Readonly<Record<string, string | undefined>>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(source).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
}

export function loadConfig(source: Readonly<Record<string, string | undefined>>): Config {
  const result = envSchema.safeParse(withoutEmptyValues(source));
  if (!result.success) {
    throw new ConfigError(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }
  const env = result.data;
  return {
    port: env.PORT,
    env: env.NODE_ENV,
    logLevel: env.LOG_LEVEL,
    storage: toStorage(env),
    jwt: { secret: env.JWT_SECRET, ttlSeconds: env.JWT_TTL },
    corsOrigins: env.CORS_ORIGIN,
    trustProxy: env.TRUST_PROXY ?? false,
    simulationEnabled: env.SIMULATION_ENABLED,
  };
}
