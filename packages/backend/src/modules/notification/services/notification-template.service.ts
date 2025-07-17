import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as Handlebars from 'handlebars';

@Injectable()
export class NotificationTemplateService {
  private readonly logger = new Logger(NotificationTemplateService.name);

  constructor(private readonly prismaService: PrismaService) {
    this.registerHelpers();
  }

  private registerHelpers(): void {
    // Register common Handlebars helpers
    Handlebars.registerHelper('date', (date: Date | string) => {
      return new Date(date).toLocaleDateString();
    });

    Handlebars.registerHelper('datetime', (date: Date | string) => {
      return new Date(date).toLocaleString();
    });

    Handlebars.registerHelper('uppercase', (str: string) => {
      return str?.toUpperCase();
    });

    Handlebars.registerHelper('lowercase', (str: string) => {
      return str?.toLowerCase();
    });
  }

  /**
   * Render a template with data
   */
  async renderTemplate(
    type: string,
    data: Record<string, any>,
    locale = 'en',
  ): Promise<{
    subject: string;
    html: string;
    text: string;
  }> {
    // Try to find template for specific locale
    let template = await this.prismaService.notificationTemplate.findFirst({
      where: {
        channelType: type as any,
        language: locale,
        isActive: true,
      },
    });

    // Fallback to default locale if not found
    if (!template && locale !== 'en') {
      template = await this.prismaService.notificationTemplate.findFirst({
        where: {
          channelType: type as any,
          language: 'en',
          isActive: true,
        },
      });
    }

    if (!template) {
      throw new Error(`Template not found: ${type} (locale: ${locale})`);
    }

    if (!template.isActive) {
      throw new Error(`Template is not active: ${type}`);
    }

    try {
      const subjectTemplate = Handlebars.compile(template.subject || '');
      const htmlTemplate = Handlebars.compile(template.bodyHtml || '');
      const textTemplate = Handlebars.compile(template.bodyText);

      return {
        subject: subjectTemplate(data),
        html: htmlTemplate(data),
        text: textTemplate(data),
      };
    } catch (error) {
      this.logger.error(`Failed to render template ${type}`, error);
      throw error;
    }
  }

  /**
   * Create a new template
   */
  async createTemplate(data: {
    name: string;
    channelType: string;
    subject: string;
    bodyHtml: string;
    bodyText: string;
    language?: string;
    variables?: any;
  }) {
    return this.prismaService.notificationTemplate.create({
      data: {
        ...data,
        language: data.language || 'en',
      } as any,
    });
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    id: string,
    data: Partial<{
      name: string;
      subject: string;
      bodyHtml: string;
      bodyText: string;
      variables: any;
      isActive: boolean;
    }>,
  ) {
    return this.prismaService.notificationTemplate.update({
      where: { id },
      data,
    });
  }

  /**
   * Get a template by ID or type
   */
  async getTemplate(id?: string, type?: string, locale?: string) {
    if (id) {
      return this.prismaService.notificationTemplate.findFirst({
        where: { id },
      });
    }

    if (type) {
      return this.prismaService.notificationTemplate.findFirst({
        where: {
          channelType: type as any,
          language: locale || 'en',
        },
      });
    }

    return null;
  }

  /**
   * List templates with optional filters
   */
  async listTemplates(filters?: { channelType?: string; language?: string; isActive?: boolean }) {
    const where: any = {};
    if (filters) {
      if (filters.channelType) where.channelType = filters.channelType;
      if (filters.language) where.language = filters.language;
      if (filters.isActive !== undefined) where.isActive = filters.isActive;
    }
    return this.prismaService.notificationTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string) {
    return this.prismaService.notificationTemplate.delete({
      where: { id },
    });
  }

  /**
   * Validate template syntax
   */
  validateTemplate(
    template: string,
    sampleData: Record<string, any>,
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    try {
      const compiled = Handlebars.compile(template);
      compiled(sampleData);

      // Check for missing variables
      const variableRegex = /\{\{([^}]+)\}\}/g;
      let match;
      while ((match = variableRegex.exec(template)) !== null) {
        const variable = match[1].trim();
        if (!variable.includes(' ') && !variable.includes('#') && !variable.includes('/')) {
          if (!(variable in sampleData)) {
            errors.push(`Missing variable: ${variable}`);
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      errors.push(`Template compilation error: ${error.message}`);
      return {
        isValid: false,
        errors,
      };
    }
  }
}
