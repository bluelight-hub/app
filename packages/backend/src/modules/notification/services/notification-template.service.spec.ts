import { Test, TestingModule } from '@nestjs/testing';
import { NotificationTemplateService } from './notification-template.service';
import { PrismaService } from '@/prisma/prisma.service';
// import { TemplateType } from '../enums/notification.enums';
const TemplateType = {
  SECURITY_ALERT: 'SECURITY_ALERT',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
};

describe('NotificationTemplateService', () => {
  let service: NotificationTemplateService;
  let prismaService: PrismaService;

  const mockTemplate = {
    id: '1',
    name: 'security_alert',
    channelType: 'EMAIL' as any,
    subject: 'Security Alert: {{alertType}}',
    bodyHtml: '<h1>Security Alert</h1><p>{{message}}</p>',
    bodyText: 'Security Alert\n{{message}}',
    language: 'en',
    variables: {
      alertType: 'string',
      message: 'string',
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationTemplateService,
        {
          provide: PrismaService,
          useValue: {
            notificationTemplate: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<NotificationTemplateService>(NotificationTemplateService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('renderTemplate', () => {
    it('should render template with data', async () => {
      (prismaService.notificationTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await service.renderTemplate(
        TemplateType.SECURITY_ALERT,
        { alertType: 'Login Attempt', message: 'Suspicious login detected' },
        'en',
      );

      expect(result).toEqual({
        subject: 'Security Alert: Login Attempt',
        html: '<h1>Security Alert</h1><p>Suspicious login detected</p>',
        text: 'Security Alert\nSuspicious login detected',
      });
    });

    it('should handle missing template', async () => {
      (prismaService.notificationTemplate.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.renderTemplate(TemplateType.SECURITY_ALERT, {}, 'en')).rejects.toThrow(
        'Template not found: SECURITY_ALERT (locale: en)',
      );
    });

    it('should handle inactive template', async () => {
      (prismaService.notificationTemplate.findFirst as jest.Mock).mockResolvedValue({
        ...mockTemplate,
        isActive: false,
      });

      await expect(service.renderTemplate(TemplateType.SECURITY_ALERT, {}, 'en')).rejects.toThrow(
        'Template is not active: SECURITY_ALERT',
      );
    });

    it('should handle template rendering errors', async () => {
      const invalidTemplate = {
        ...mockTemplate,
        bodyHtml: '{{#if}}Invalid template',
      };
      (prismaService.notificationTemplate.findFirst as jest.Mock).mockResolvedValue(
        invalidTemplate,
      );

      await expect(service.renderTemplate(TemplateType.SECURITY_ALERT, {}, 'en')).rejects.toThrow();
    });

    it('should fallback to default locale', async () => {
      (prismaService.notificationTemplate.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // First call with 'de' locale
        .mockResolvedValueOnce(mockTemplate); // Second call with 'en' locale

      const result = await service.renderTemplate(
        TemplateType.SECURITY_ALERT,
        { alertType: 'Test', message: 'Test message' },
        'de',
      );

      expect(prismaService.notificationTemplate.findFirst).toHaveBeenCalledTimes(2);
      expect(prismaService.notificationTemplate.findFirst).toHaveBeenNthCalledWith(1, {
        where: {
          channelType: TemplateType.SECURITY_ALERT as any,
          language: 'de',
          isActive: true,
        },
      });
      expect(prismaService.notificationTemplate.findFirst).toHaveBeenNthCalledWith(2, {
        where: {
          channelType: TemplateType.SECURITY_ALERT as any,
          language: 'en',
          isActive: true,
        },
      });
      expect(result.subject).toBe('Security Alert: Test');
    });
  });

  describe('createTemplate', () => {
    it('should create a new template', async () => {
      const templateData = {
        name: 'new_template',
        channelType: TemplateType.SECURITY_ALERT as any,
        subject: 'New Template',
        bodyHtml: '<p>New</p>',
        bodyText: 'New',
        language: 'en',
        variables: { test: 'string' },
      };

      (prismaService.notificationTemplate.create as jest.Mock).mockResolvedValue({
        id: '2',
        ...templateData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createTemplate(templateData);

      expect(result).toHaveProperty('id');
      expect(result.name).toBe('new_template');
      expect(prismaService.notificationTemplate.create).toHaveBeenCalledWith({
        data: templateData,
      });
    });
  });

  describe('updateTemplate', () => {
    it('should update an existing template', async () => {
      const updateData = {
        subject: 'Updated Subject',
        bodyHtml: '<p>Updated</p>',
      };

      (prismaService.notificationTemplate.update as jest.Mock).mockResolvedValue({
        ...mockTemplate,
        ...updateData,
      });

      const result = await service.updateTemplate('1', updateData);

      expect(result.subject).toBe('Updated Subject');
      expect(prismaService.notificationTemplate.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateData,
      });
    });
  });

  describe('getTemplate', () => {
    it('should get template by id', async () => {
      (prismaService.notificationTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await service.getTemplate('1');

      expect(result).toEqual(mockTemplate);
      expect(prismaService.notificationTemplate.findFirst).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should get template by type and locale', async () => {
      (prismaService.notificationTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await service.getTemplate(undefined, TemplateType.SECURITY_ALERT, 'en');

      expect(result).toEqual(mockTemplate);
      expect(prismaService.notificationTemplate.findFirst).toHaveBeenCalledWith({
        where: {
          channelType: TemplateType.SECURITY_ALERT as any,
          language: 'en',
        },
      });
    });
  });

  describe('listTemplates', () => {
    it('should list all templates', async () => {
      const templates = [mockTemplate, { ...mockTemplate, id: '2', name: 'another_template' }];
      (prismaService.notificationTemplate.findMany as jest.Mock).mockResolvedValue(templates);

      const result = await service.listTemplates();

      expect(result).toEqual(templates);
      expect(prismaService.notificationTemplate.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter templates by type', async () => {
      (prismaService.notificationTemplate.findMany as jest.Mock).mockResolvedValue([mockTemplate]);

      const result = await service.listTemplates({ channelType: TemplateType.SECURITY_ALERT });

      expect(result).toEqual([mockTemplate]);
      expect(prismaService.notificationTemplate.findMany).toHaveBeenCalledWith({
        where: { channelType: TemplateType.SECURITY_ALERT },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter templates by locale', async () => {
      (prismaService.notificationTemplate.findMany as jest.Mock).mockResolvedValue([mockTemplate]);

      const result = await service.listTemplates({ language: 'en' });

      expect(result).toEqual([mockTemplate]);
      expect(prismaService.notificationTemplate.findMany).toHaveBeenCalledWith({
        where: { language: 'en' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter templates by active status', async () => {
      (prismaService.notificationTemplate.findMany as jest.Mock).mockResolvedValue([mockTemplate]);

      const result = await service.listTemplates({ isActive: true });

      expect(result).toEqual([mockTemplate]);
      expect(prismaService.notificationTemplate.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a template', async () => {
      (prismaService.notificationTemplate.delete as jest.Mock).mockResolvedValue(mockTemplate);

      await service.deleteTemplate('1');

      expect(prismaService.notificationTemplate.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });
  });

  describe('validateTemplate', () => {
    it('should validate a valid template', () => {
      const template = '{{name}} - {{message}}';
      const data = { name: 'Test', message: 'Hello' };

      const result = service.validateTemplate(template, data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect missing variables', () => {
      const template = '{{name}} - {{message}} - {{missing}}';
      const data = { name: 'Test', message: 'Hello' };

      const result = service.validateTemplate(template, data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing variable: missing');
    });

    it('should handle invalid template syntax', () => {
      const template = '{{#if name}}{{name}}{{else}}';
      const data = { name: 'Test' };

      const result = service.validateTemplate(template, data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Template compilation error');
    });
  });

  describe('Handlebars helpers', () => {
    it('should register and use date helper', async () => {
      const template = {
        ...mockTemplate,
        subject: 'Date: {{date createdAt}}',
        bodyHtml: '<p>Date: {{date createdAt}}</p>',
        bodyText: 'Date: {{date createdAt}}',
      };
      (prismaService.notificationTemplate.findFirst as jest.Mock).mockResolvedValue(template);

      const testDate = new Date('2024-01-15T10:00:00Z');
      const result = await service.renderTemplate(
        TemplateType.SECURITY_ALERT,
        { createdAt: testDate },
        'en',
      );

      expect(result.subject).toContain(testDate.toLocaleDateString());
      expect(result.html).toContain(testDate.toLocaleDateString());
      expect(result.text).toContain(testDate.toLocaleDateString());
    });

    it('should register and use datetime helper', async () => {
      const template = {
        ...mockTemplate,
        subject: 'DateTime: {{datetime createdAt}}',
        bodyHtml: '<p>DateTime: {{datetime createdAt}}</p>',
        bodyText: 'DateTime: {{datetime createdAt}}',
      };
      (prismaService.notificationTemplate.findFirst as jest.Mock).mockResolvedValue(template);

      const testDate = new Date('2024-01-15T10:00:00Z');
      const result = await service.renderTemplate(
        TemplateType.SECURITY_ALERT,
        { createdAt: testDate },
        'en',
      );

      expect(result.subject).toContain(testDate.toLocaleString());
      expect(result.html).toContain(testDate.toLocaleString());
      expect(result.text).toContain(testDate.toLocaleString());
    });

    it('should register and use uppercase helper', async () => {
      const template = {
        ...mockTemplate,
        subject: 'Name: {{uppercase name}}',
        bodyHtml: '<p>Name: {{uppercase name}}</p>',
        bodyText: 'Name: {{uppercase name}}',
      };
      (prismaService.notificationTemplate.findFirst as jest.Mock).mockResolvedValue(template);

      const result = await service.renderTemplate(
        TemplateType.SECURITY_ALERT,
        { name: 'john doe' },
        'en',
      );

      expect(result.subject).toBe('Name: JOHN DOE');
      expect(result.html).toBe('<p>Name: JOHN DOE</p>');
      expect(result.text).toBe('Name: JOHN DOE');
    });

    it('should register and use lowercase helper', async () => {
      const template = {
        ...mockTemplate,
        subject: 'Email: {{lowercase email}}',
        bodyHtml: '<p>Email: {{lowercase email}}</p>',
        bodyText: 'Email: {{lowercase email}}',
      };
      (prismaService.notificationTemplate.findFirst as jest.Mock).mockResolvedValue(template);

      const result = await service.renderTemplate(
        TemplateType.SECURITY_ALERT,
        { email: 'JOHN.DOE@EXAMPLE.COM' },
        'en',
      );

      expect(result.subject).toBe('Email: john.doe@example.com');
      expect(result.html).toBe('<p>Email: john.doe@example.com</p>');
      expect(result.text).toBe('Email: john.doe@example.com');
    });

    it('should handle undefined values in helpers', async () => {
      const template = {
        ...mockTemplate,
        subject: 'Value: {{uppercase value}}',
        bodyHtml: '<p>Value: {{uppercase value}}</p>',
        bodyText: 'Value: {{uppercase value}}',
      };
      (prismaService.notificationTemplate.findFirst as jest.Mock).mockResolvedValue(template);

      const result = await service.renderTemplate(
        TemplateType.SECURITY_ALERT,
        { value: undefined },
        'en',
      );

      expect(result.subject).toBe('Value: ');
      expect(result.html).toBe('<p>Value: </p>');
      expect(result.text).toBe('Value: ');
    });

    it('should handle string dates in date helper', async () => {
      const template = {
        ...mockTemplate,
        subject: 'Date: {{date dateString}}',
      };
      (prismaService.notificationTemplate.findFirst as jest.Mock).mockResolvedValue(template);

      const dateString = '2024-01-15T10:00:00Z';
      const result = await service.renderTemplate(
        TemplateType.SECURITY_ALERT,
        { dateString },
        'en',
      );

      expect(result.subject).toContain(new Date(dateString).toLocaleDateString());
    });
  });

  describe('getTemplate', () => {
    it('should return null when neither id nor type is provided', async () => {
      const result = await service.getTemplate();
      expect(result).toBeNull();
      expect(prismaService.notificationTemplate.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('renderTemplate error handling', () => {
    it('should handle template compilation errors and rethrow', async () => {
      const template = {
        ...mockTemplate,
        subject: '{{#if}}Invalid handlebars', // Invalid Handlebars syntax
        bodyHtml: '<p>Valid</p>',
        bodyText: 'Valid',
      };
      (prismaService.notificationTemplate.findFirst as jest.Mock).mockResolvedValue(template);

      await expect(service.renderTemplate(TemplateType.SECURITY_ALERT, {}, 'en')).rejects.toThrow();
    });

    it('should handle bodyHtml being null or empty', async () => {
      const template = {
        ...mockTemplate,
        subject: 'Test Subject',
        bodyHtml: null, // null bodyHtml
        bodyText: 'Test Text',
      };
      (prismaService.notificationTemplate.findFirst as jest.Mock).mockResolvedValue(template);

      const result = await service.renderTemplate(
        TemplateType.SECURITY_ALERT,
        { alertType: 'Test' },
        'en',
      );

      expect(result.subject).toBe('Test Subject');
      expect(result.html).toBe(''); // Empty string for null template
      expect(result.text).toBe('Test Text');
    });

    it('should handle subject being null or empty', async () => {
      const template = {
        ...mockTemplate,
        subject: null, // null subject
        bodyHtml: '<p>Test</p>',
        bodyText: 'Test',
      };
      (prismaService.notificationTemplate.findFirst as jest.Mock).mockResolvedValue(template);

      const result = await service.renderTemplate(
        TemplateType.SECURITY_ALERT,
        { message: 'Test' },
        'en',
      );

      expect(result.subject).toBe(''); // Empty string for null template
      expect(result.html).toBe('<p>Test</p>');
      expect(result.text).toBe('Test');
    });
  });

  describe('listTemplates with undefined filters', () => {
    it('should handle listTemplates being called without any arguments', async () => {
      const templates = [mockTemplate];
      (prismaService.notificationTemplate.findMany as jest.Mock).mockResolvedValue(templates);

      const result = await service.listTemplates();

      expect(result).toEqual(templates);
      expect(prismaService.notificationTemplate.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle filters object without any properties', async () => {
      const templates = [mockTemplate];
      (prismaService.notificationTemplate.findMany as jest.Mock).mockResolvedValue(templates);

      const result = await service.listTemplates({});

      expect(result).toEqual(templates);
      expect(prismaService.notificationTemplate.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('Handlebars helpers edge cases', () => {
    it('should handle null values in lowercase helper', async () => {
      const template = {
        ...mockTemplate,
        subject: 'Value: {{lowercase nullValue}}',
        bodyHtml: '<p>Value: {{lowercase nullValue}}</p>',
        bodyText: 'Value: {{lowercase nullValue}}',
      };
      (prismaService.notificationTemplate.findFirst as jest.Mock).mockResolvedValue(template);

      const result = await service.renderTemplate(
        TemplateType.SECURITY_ALERT,
        { nullValue: null },
        'en',
      );

      expect(result.subject).toBe('Value: ');
      expect(result.html).toBe('<p>Value: </p>');
      expect(result.text).toBe('Value: ');
    });

    it('should handle null values in uppercase helper', async () => {
      const template = {
        ...mockTemplate,
        subject: 'Value: {{uppercase nullValue}}',
        bodyHtml: '<p>Value: {{uppercase nullValue}}</p>',
        bodyText: 'Value: {{uppercase nullValue}}',
      };
      (prismaService.notificationTemplate.findFirst as jest.Mock).mockResolvedValue(template);

      const result = await service.renderTemplate(
        TemplateType.SECURITY_ALERT,
        { nullValue: null },
        'en',
      );

      expect(result.subject).toBe('Value: ');
      expect(result.html).toBe('<p>Value: </p>');
      expect(result.text).toBe('Value: ');
    });

    it('should handle invalid dates in date helper', async () => {
      const template = {
        ...mockTemplate,
        subject: 'Date: {{date invalidDate}}',
      };
      (prismaService.notificationTemplate.findFirst as jest.Mock).mockResolvedValue(template);

      const result = await service.renderTemplate(
        TemplateType.SECURITY_ALERT,
        { invalidDate: 'not-a-date' },
        'en',
      );

      expect(result.subject).toBe('Date: Invalid Date');
    });

    it('should handle invalid dates in datetime helper', async () => {
      const template = {
        ...mockTemplate,
        subject: 'DateTime: {{datetime invalidDate}}',
      };
      (prismaService.notificationTemplate.findFirst as jest.Mock).mockResolvedValue(template);

      const result = await service.renderTemplate(
        TemplateType.SECURITY_ALERT,
        { invalidDate: 'not-a-date' },
        'en',
      );

      expect(result.subject).toBe('DateTime: Invalid Date');
    });
  });
});
