/**
 * Typed application configuration assembled from environment variables.
 * Registered with @nestjs/config; consumed via ConfigService<AppConfig>.
 */
export interface AppConfig {
  env: string;
  port: number;
  globalPrefix: string;
  corsOrigins: string[];
  logLevel: string;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  ai: {
    provider: 'deterministic' | 'anthropic';
    anthropicApiKey: string;
    model: string;
    maxRetries: number;
  };
}

export default (): AppConfig => {
  const provider = (process.env.AI_PROVIDER ?? 'deterministic').toLowerCase();

  return {
    env: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.API_PORT ?? '3001', 10),
    globalPrefix: process.env.API_GLOBAL_PREFIX ?? 'api',
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    logLevel: process.env.LOG_LEVEL ?? 'info',
    jwt: {
      secret: process.env.JWT_SECRET ?? 'change_me_super_secret_dev_only',
      expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
    },
    ai: {
      provider: provider === 'anthropic' ? 'anthropic' : 'deterministic',
      anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
      model: process.env.AI_MODEL ?? 'claude-sonnet-5',
      maxRetries: parseInt(process.env.AI_MAX_RETRIES ?? '2', 10),
    },
  };
};
