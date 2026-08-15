import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsISO8601,
  IsArray,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TaskCategory, TaskSize, TaskStatus } from '../../domain/enums';

export class PlanDayDto {
  @ApiProperty({
    example: 'Tomorrow I have a client meeting at 10 AM, complete presentation, gym in the evening, pick up medicines.',
    description: 'Free-form natural language description of the day.',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  input!: string;

  @ApiPropertyOptional({ description: 'Persist the generated tasks (default true).', default: true })
  @IsOptional()
  persist?: boolean;
}

export class CreateTaskDto {
  @ApiProperty({ example: 'Complete presentation' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: TaskCategory, default: TaskCategory.OTHER })
  @IsOptional()
  @IsEnum(TaskCategory)
  category?: TaskCategory;

  @ApiPropertyOptional({ enum: TaskSize, default: TaskSize.MEDIUM })
  @IsOptional()
  @IsEnum(TaskSize)
  size?: TaskSize;

  @ApiProperty({ example: 60, description: 'Estimated duration in minutes.' })
  @IsInt()
  @Min(1)
  @Max(1440)
  estimatedMinutes!: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, default: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  urgency?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, default: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  importance?: number;

  @ApiPropertyOptional({ example: '2026-07-25T10:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  suggestedStart?: string;

  @ApiPropertyOptional({ example: '2026-07-25T11:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  suggestedEnd?: string;

  @ApiPropertyOptional({ example: '2026-07-25T23:59:00.000Z' })
  @IsOptional()
  @IsISO8601()
  deadline?: string;

  @ApiPropertyOptional({ type: [String], description: 'Task IDs this task depends on.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencyIds?: string[];
}

export class UpdateTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: TaskCategory })
  @IsOptional()
  @IsEnum(TaskCategory)
  category?: TaskCategory;

  @ApiPropertyOptional({ enum: TaskSize })
  @IsOptional()
  @IsEnum(TaskSize)
  size?: TaskSize;

  @ApiPropertyOptional({ minimum: 1, maximum: 1440 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  estimatedMinutes?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  urgency?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  importance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  deadline?: string;
}

export class RescheduleTaskDto {
  @ApiProperty({ example: '2026-07-25T14:00:00.000Z' })
  @IsISO8601()
  start!: string;

  @ApiProperty({ example: '2026-07-25T15:00:00.000Z' })
  @IsISO8601()
  end!: string;
}

export class ListTasksQueryDto {
  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ description: 'Filter to a specific daily plan.' })
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiPropertyOptional({ description: 'Start of window (ISO-8601).' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'End of window (ISO-8601).' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
