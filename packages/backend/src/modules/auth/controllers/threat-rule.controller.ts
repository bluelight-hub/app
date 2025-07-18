import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../types/jwt.types';
import { RuleRepositoryService } from '../rules/rule-repository.service';
import { RuleEngineService } from '../rules/rule-engine.service';
import {
  CreateThreatRuleDto,
  UpdateThreatRuleDto,
  ThreatRuleDto,
  ThreatRuleFilterDto,
  RuleStatisticsDto,
  TestRuleDto,
  RuleEvaluationResultDto,
} from '../dto/threat-rule.dto';
import { RuleContext } from '../rules/rule.interface';
import { SecurityEventType } from '../enums/security-event-type.enum';

/**
 * Controller für Threat Detection Rules Management
 */
@ApiTags('Threat Detection')
@ApiBearerAuth()
@Controller('threat-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ThreatRuleController {
  constructor(
    private readonly ruleRepository: RuleRepositoryService,
    private readonly ruleEngine: RuleEngineService,
  ) {}

  /**
   * Holt alle Threat Detection Rules
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all threat detection rules' })
  @ApiResponse({ status: 200, type: [ThreatRuleDto] })
  async getRules(@Query() filters: ThreatRuleFilterDto): Promise<ThreatRuleDto[]> {
    return this.ruleRepository.getRules(filters);
  }

  /**
   * Holt eine spezifische Regel
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get a specific threat detection rule' })
  @ApiResponse({ status: 200, type: ThreatRuleDto })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async getRule(@Param('id') id: string): Promise<ThreatRuleDto> {
    const rule = await this.ruleRepository.getRule(id);
    if (!rule) {
      throw new Error('Rule not found');
    }
    return rule;
  }

  /**
   * Erstellt eine neue Regel
   */
  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new threat detection rule' })
  @ApiResponse({ status: 201, description: 'Rule created successfully' })
  async createRule(@Body() dto: CreateThreatRuleDto): Promise<{ id: string }> {
    const id = await this.ruleRepository.createRule(dto);
    return { id };
  }

  /**
   * Aktualisiert eine bestehende Regel
   */
  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a threat detection rule' })
  @ApiResponse({ status: 200, description: 'Rule updated successfully' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async updateRule(@Param('id') id: string, @Body() dto: UpdateThreatRuleDto): Promise<void> {
    await this.ruleRepository.updateRule(id, dto);
  }

  /**
   * Löscht eine Regel
   */
  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a threat detection rule' })
  @ApiResponse({ status: 204, description: 'Rule deleted successfully' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async deleteRule(@Param('id') id: string): Promise<void> {
    await this.ruleRepository.deleteRule(id);
  }

  /**
   * Holt Regel-Statistiken
   */
  @Get('statistics/overview')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get threat detection rule statistics' })
  @ApiResponse({ status: 200, type: RuleStatisticsDto })
  async getStatistics(): Promise<RuleStatisticsDto> {
    return this.ruleRepository.getRuleStatistics();
  }

  /**
   * Testet eine Regel manuell
   */
  @Post('test')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Test a threat detection rule manually' })
  @ApiResponse({ status: 200, type: RuleEvaluationResultDto })
  async testRule(@Body() dto: TestRuleDto): Promise<RuleEvaluationResultDto> {
    const rule = this.ruleEngine.getRule(dto.ruleId);
    if (!rule) {
      throw new Error('Rule not found');
    }

    // Build context from DTO
    const context: RuleContext = {
      userId: dto.context.userId,
      email: dto.context.email,
      ipAddress: dto.context.ipAddress,
      userAgent: dto.context.userAgent,
      timestamp: new Date(),
      eventType: dto.context.eventType as SecurityEventType,
      metadata: dto.context.metadata,
      recentEvents: dto.recentEvents?.map((event) => ({
        ...event,
        eventType: event.eventType as SecurityEventType,
      })),
    };

    const startTime = Date.now();
    const result = await rule.evaluate(context);
    const executionTime = Date.now() - startTime;

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      matched: result.matched,
      severity: result.severity,
      score: result.score,
      reason: result.reason,
      evidence: result.evidence,
      suggestedActions: result.suggestedActions,
      evaluatedAt: new Date(),
      executionTime,
    };
  }

  /**
   * Lädt alle Regeln neu (hot reload)
   */
  @Post('reload')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reload all threat detection rules' })
  @ApiResponse({ status: 204, description: 'Rules reloaded successfully' })
  async reloadRules(): Promise<void> {
    await this.ruleRepository.loadAllRules();
  }

  /**
   * Holt die aktuelle Engine-Metriken
   */
  @Get('metrics/engine')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get threat detection engine metrics' })
  @ApiResponse({ status: 200, description: 'Engine metrics' })
  async getEngineMetrics() {
    return this.ruleEngine.getMetrics();
  }

  /**
   * Holt Statistiken für eine spezifische Regel
   */
  @Get(':id/statistics')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get statistics for a specific rule' })
  @ApiResponse({ status: 200, description: 'Rule statistics' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async getRuleStatistics(@Param('id') id: string) {
    const stats = this.ruleEngine.getRuleStats(id);
    if (!stats) {
      throw new Error('Rule statistics not found');
    }
    return stats;
  }
}
