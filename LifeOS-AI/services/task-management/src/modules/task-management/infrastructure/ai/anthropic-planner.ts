import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiPlanner, PlannerContext, PlanResult } from '../../application/ports/ai-planner.port';
import { PromptBuilder } from './prompt-builder';
import { ResponseParser } from './response-parser';
import { DeterministicPlanner } from './deterministic-planner';
import { AppConfig } from '../../../../config/configuration';

/**
 * LLM-backed planner (Anthropic Claude). Applies a bounded retry strategy and
 * degrades gracefully to the deterministic planner if the API key is missing,
 * the call fails, or the response cannot be parsed — so a plan is always returned.
 */
@Injectable()
export class AnthropicPlanner implements AiPlanner {
  private readonly logger = new Logger(AnthropicPlanner.name);

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly fallback: DeterministicPlanner,
  ) {}

  async plan(input: string, ctx: PlannerContext): Promise<PlanResult> {
    const ai = this.config.get('ai', { infer: true });
    if (!ai.anthropicApiKey) {
      this.logger.warn('ANTHROPIC_API_KEY not set — using deterministic planner.');
      return this.fallback.plan(input, ctx);
    }

    let client: any;
    try {
      // Dynamic import so the SDK is only loaded when actually used.
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      client = new Anthropic({ apiKey: ai.anthropicApiKey });
    } catch (err) {
      this.logger.error(`Failed to initialise Anthropic SDK: ${String(err)} — falling back.`);
      return this.fallback.plan(input, ctx);
    }

    const maxAttempts = Math.max(1, ai.maxRetries + 1);
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const message = await client.messages.create({
          model: ai.model,
          max_tokens: 2048,
          system: PromptBuilder.system(),
          messages: [{ role: 'user', content: PromptBuilder.user(input, ctx) }],
        });
        const text = (message.content ?? [])
          .filter((b: any) => b.type === 'text')
          .map((b: any) => b.text)
          .join('\n');
        return ResponseParser.parse(text);
      } catch (err) {
        this.logger.warn(`Anthropic plan attempt ${attempt}/${maxAttempts} failed: ${String(err)}`);
        if (attempt === maxAttempts) {
          this.logger.error('All Anthropic attempts failed — using deterministic planner.');
          return this.fallback.plan(input, ctx);
        }
      }
    }

    // Unreachable, but keeps the type checker satisfied.
    return this.fallback.plan(input, ctx);
  }
}
