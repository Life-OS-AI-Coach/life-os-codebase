import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_PLANNER } from '../../application/ports/ai-planner.port';
import { DeterministicPlanner } from './deterministic-planner';
import { AnthropicPlanner } from './anthropic-planner';
import { AppConfig } from '../../../../config/configuration';

/**
 * Binds the AI_PLANNER port to a concrete engine chosen at runtime by
 * configuration (AI_PROVIDER). Defaults to the deterministic engine.
 */
export const plannerProvider: Provider = {
  provide: AI_PLANNER,
  inject: [ConfigService, DeterministicPlanner, AnthropicPlanner],
  useFactory: (
    config: ConfigService<AppConfig, true>,
    deterministic: DeterministicPlanner,
    anthropic: AnthropicPlanner,
  ) => {
    const provider = config.get('ai', { infer: true }).provider;
    return provider === 'anthropic' ? anthropic : deterministic;
  },
};
