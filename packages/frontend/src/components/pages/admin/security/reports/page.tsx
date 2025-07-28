import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  DatePicker,
  Select,
  Modal,
  Form,
  Input,
  message,
  // Progress,
  Row,
  Col,
  Statistic,
  Alert,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PiDownload,
  PiFilePdf,
  PiFileText,
  PiCalendar,
  PiChartLine,
  PiShieldCheck,
  PiWarning,
  PiCheckCircle,
  PiClock,
} from 'react-icons/pi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { securityApi, SecurityReport } from '@/api/security';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import dayjs, { Dayjs } from 'dayjs';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const { RangePicker } = DatePicker;
const { Option } = Select;

// PDF Styles
const pdfStyles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #000',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#bfbfbf',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#bfbfbf',
    padding: 5,
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 10,
    color: '#666',
  },
});

// PDF Document Component
const SecurityReportPDF: React.FC<{ report: SecurityReport; data: any }> = ({ report, data }) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <View style={pdfStyles.header}>
        <Text style={pdfStyles.title}>{report.title}</Text>
        <Text style={pdfStyles.subtitle}>{report.description}</Text>
        <Text style={pdfStyles.subtitle}>
          Zeitraum: {format(new Date(report.period.start), 'dd.MM.yyyy', { locale: de })} -{' '}
          {format(new Date(report.period.end), 'dd.MM.yyyy', { locale: de })}
        </Text>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Zusammenfassung</Text>
        <Text>Gesamtanzahl Sicherheitsereignisse: {data.totalEvents || 0}</Text>
        <Text>Kritische Vorfälle: {data.criticalIncidents || 0}</Text>
        <Text>Behobene Vorfälle: {data.resolvedIncidents || 0}</Text>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Detaillierte Metriken</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableRow}>
            <Text style={pdfStyles.tableCell}>Metrik</Text>
            <Text style={pdfStyles.tableCell}>Wert</Text>
          </View>
          {Object.entries(report.metrics).map(([key, value]) => (
            <View key={key} style={pdfStyles.tableRow}>
              <Text style={pdfStyles.tableCell}>{key}</Text>
              <Text style={pdfStyles.tableCell}>{String(value)}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={pdfStyles.footer}>
        Generiert am {format(new Date(report.generatedAt), 'dd.MM.yyyy HH:mm', { locale: de })} von {report.generatedBy}
      </Text>
    </Page>
  </Document>
);

/**
 * Security Reports - Compliance und Audit Reports
 */
const SecurityReports: React.FC = () => {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([dayjs().subtract(1, 'month'), dayjs()]);
  const [reportType, setReportType] = useState<string>('all');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Query für Reports
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['security-reports', reportType, dateRange],
    queryFn: () =>
      securityApi.getSecurityReports({
        type: reportType !== 'all' ? reportType : undefined,
        startDate: dateRange[0]?.format('YYYY-MM-DD'),
        endDate: dateRange[1]?.format('YYYY-MM-DD'),
      }),
  });

  // Mutation für Report-Generierung
  const generateMutation = useMutation({
    mutationFn: securityApi.generateSecurityReport,
    onSuccess: (result) => {
      message.success('Report wurde erfolgreich generiert');
      queryClient.invalidateQueries({ queryKey: ['security-reports'] });
      setIsGenerateModalOpen(false);
      form.resetFields();

      // Download starten
      window.open(result.downloadUrl, '_blank');
    },
    onError: () => {
      message.error('Fehler beim Generieren des Reports');
    },
  });

  // Download Report
  const handleDownload = async (reportId: string) => {
    try {
      const blob = await securityApi.downloadReport(reportId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-report-${reportId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('Report wurde heruntergeladen');
    } catch (_error) {
      message.error('Fehler beim Herunterladen des Reports');
    }
  };

  // Report Type Tag
  const getReportTypeTag = (type: string) => {
    const config = {
      compliance: { color: 'blue', text: 'Compliance', icon: <PiCheckCircle /> },
      audit: { color: 'green', text: 'Audit', icon: <PiShieldCheck /> },
      incident: { color: 'orange', text: 'Incident', icon: <PiWarning /> },
      summary: { color: 'purple', text: 'Zusammenfassung', icon: <PiChartLine /> },
    }[type] || { color: 'default', text: type };

    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // Tabellen-Spalten
  const columns: ColumnsType<SecurityReport> = [
    {
      title: 'Typ',
      dataIndex: 'type',
      key: 'type',
      render: (type) => getReportTypeTag(type),
    },
    {
      title: 'Titel',
      dataIndex: 'title',
      key: 'title',
      render: (title) => <span className="font-medium">{title}</span>,
    },
    {
      title: 'Beschreibung',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Zeitraum',
      key: 'period',
      render: (_, record) => (
        <Space>
          <PiCalendar />
          {format(new Date(record.period.start), 'dd.MM.yyyy', { locale: de })} -{' '}
          {format(new Date(record.period.end), 'dd.MM.yyyy', { locale: de })}
        </Space>
      ),
    },
    {
      title: 'Erstellt',
      key: 'generated',
      render: (_, record) => (
        <div>
          <div>{format(new Date(record.generatedAt), 'dd.MM.yyyy HH:mm', { locale: de })}</div>
          <div className="text-sm text-gray-500">von {record.generatedBy}</div>
        </div>
      ),
    },
    {
      title: 'Aktionen',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<PiDownload />} onClick={() => handleDownload(record.id)}>
            Download
          </Button>
          {record.metrics && (
            <PDFDownloadLink
              document={<SecurityReportPDF report={record} data={record.metrics} />}
              fileName={`security-report-${record.id}.pdf`}
            >
              {({ loading }) => (
                <Button size="small" icon={<PiFilePdf />} loading={loading}>
                  PDF
                </Button>
              )}
            </PDFDownloadLink>
          )}
        </Space>
      ),
    },
  ];

  // Statistiken berechnen
  const totalReports = reports.length;
  const complianceReports = reports.filter((r) => r.type === 'compliance').length;
  const incidentReports = reports.filter((r) => r.type === 'incident').length;
  const lastReportDate =
    reports.length > 0 ? format(new Date(reports[0].generatedAt), 'dd.MM.yyyy', { locale: de }) : 'N/A';

  const handleGenerateReport = (values: any) => {
    generateMutation.mutate({
      type: values.type,
      startDate: values.dateRange[0].format('YYYY-MM-DD'),
      endDate: values.dateRange[1].format('YYYY-MM-DD'),
      format: values.format,
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Security Reports</h1>
        <p className="text-gray-600">Generieren und verwalten Sie Compliance- und Audit-Reports</p>
      </div>

      {/* Statistiken */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={6}>
          <Card>
            <Statistic title="Gesamt Reports" value={totalReports} prefix={<PiFileText className="text-blue-500" />} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Compliance Reports"
              value={complianceReports}
              prefix={<PiCheckCircle className="text-green-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Incident Reports"
              value={incidentReports}
              prefix={<PiWarning className="text-orange-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic title="Letzter Report" value={lastReportDate} prefix={<PiClock className="text-gray-500" />} />
          </Card>
        </Col>
      </Row>

      <Card>
        <div className="mb-4 flex flex-wrap gap-4 justify-between">
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs])}
              format="DD.MM.YYYY"
            />
            <Select value={reportType} onChange={setReportType} style={{ width: 200 }}>
              <Option value="all">Alle Typen</Option>
              <Option value="compliance">Compliance</Option>
              <Option value="audit">Audit</Option>
              <Option value="incident">Incident</Option>
              <Option value="summary">Zusammenfassung</Option>
            </Select>
          </Space>
          <Button
            type="primary"
            icon={<PiChartLine />}
            onClick={() => {
              form.setFieldsValue({
                dateRange: [dayjs().subtract(1, 'month'), dayjs()],
                format: 'pdf',
              });
              setIsGenerateModalOpen(true);
            }}
          >
            Neuen Report generieren
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={reports}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${total} Reports gesamt`,
          }}
        />
      </Card>

      {/* Generate Report Modal */}
      <Modal
        title="Neuen Security Report generieren"
        open={isGenerateModalOpen}
        onCancel={() => {
          setIsGenerateModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Alert
          message="Report-Generierung"
          description="Der Report wird basierend auf den gewählten Parametern generiert und steht anschließend zum Download bereit."
          type="info"
          showIcon
          className="mb-4"
        />

        <Form form={form} layout="vertical" onFinish={handleGenerateReport}>
          <Form.Item name="type" label="Report-Typ" rules={[{ required: true, message: 'Bitte Report-Typ auswählen' }]}>
            <Select>
              <Option value="compliance">Compliance Report</Option>
              <Option value="audit">Audit Report</Option>
              <Option value="incident">Incident Report</Option>
              <Option value="summary">Zusammenfassung</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="dateRange"
            label="Zeitraum"
            rules={[{ required: true, message: 'Bitte Zeitraum auswählen' }]}
          >
            <RangePicker
              style={{ width: '100%' }}
              format="DD.MM.YYYY"
              disabledDate={(current) => current && current > dayjs().endOf('day')}
            />
          </Form.Item>

          <Form.Item
            name="format"
            label="Format"
            rules={[{ required: true, message: 'Bitte Format auswählen' }]}
            initialValue="pdf"
          >
            <Select>
              <Option value="pdf">PDF</Option>
              <Option value="csv">CSV</Option>
            </Select>
          </Form.Item>

          <Form.Item name="notes" label="Zusätzliche Notizen (optional)">
            <Input.TextArea rows={3} placeholder="Zusätzliche Informationen oder Kontext für den Report" />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => setIsGenerateModalOpen(false)}>Abbrechen</Button>
              <Button type="primary" htmlType="submit" loading={generateMutation.isPending}>
                Report generieren
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SecurityReports;
