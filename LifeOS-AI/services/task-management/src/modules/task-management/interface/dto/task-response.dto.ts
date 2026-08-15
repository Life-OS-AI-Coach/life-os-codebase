import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskCategory, TaskSize, TaskStatus, EisenhowerQuadrant } from '../../domain/enums';

export class TaskResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ enum: TaskCategory }) category!: TaskCategory;
  @ApiProperty({ enum: TaskStatus }) status!: TaskStatus;
  @ApiProperty({ enum: TaskSize }) size!: TaskSize;
  @ApiProperty() urgency!: number;
  @ApiProperty() importance!: number;
  @ApiProperty({ enum: EisenhowerQuadrant }) quadrant!: EisenhowerQuadrant;
  @ApiProperty() priorityScore!: number;
  @ApiProperty() estimatedMinutes!: number;
  @ApiPropertyOptional({ nullable: true }) suggestedStart!: string | null;
  @ApiPropertyOptional({ nullable: true }) suggestedEnd!: string | null;
  @ApiPropertyOptional({ nullable: true }) deadline!: string | null;
  @ApiPropertyOptional({ nullable: true }) completedAt!: string | null;
  @ApiPropertyOptional({ nullable: true }) aiConfidence!: number | null;
  @ApiPropertyOptional({ nullable: true }) aiRecommendation!: string | null;
  @ApiProperty() source!: string;
  @ApiProperty() xpValue!: number;
  @ApiProperty({ type: [String] }) dependencyIds!: string[];
  @ApiPropertyOptional({ nullable: true }) planId!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class PlanResponseDto {
  @ApiPropertyOptional({ nullable: true, description: 'Persisted plan id (null when persist=false).' })
  planId!: string | null;
  @ApiProperty() summary!: string;
  @ApiProperty({ description: 'Which engine produced the plan.' }) engine!: string;
  @ApiProperty() hasConflicts!: boolean;
  @ApiProperty({ type: [String] }) conflicts!: string[];
  @ApiProperty({ type: [TaskResponseDto] }) tasks!: TaskResponseDto[];
}
