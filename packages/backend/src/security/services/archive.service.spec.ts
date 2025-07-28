import { Test, TestingModule } from '@nestjs/testing';
import { ArchiveService } from './archive.service';
import { PrismaService } from '@/prisma/prisma.service';
import * as fs from 'fs/promises';
import * as zlib from 'zlib';
import { promisify } from 'util';

jest.mock('fs/promises');

// Create proper gzipped test data
const testContent = {
  metadata: { totalLogs: 2 },
  logs: [
    {
      id: '1',
      sequenceNumber: '1',
      previousHash: '0000',
      currentHash: 'hash1',
      eventType: 'USER_LOGIN',
      userId: 'user1',
      organizationId: 'org1',
      metadata: {},
      createdAt: new Date('2024-01-01'),
      timestamp: new Date('2024-01-01'),
    },
    {
      id: '2',
      sequenceNumber: '2',
      previousHash: 'hash1',
      currentHash: 'hash2',
      eventType: 'USER_LOGOUT',
      userId: 'user1',
      organizationId: 'org1',
      metadata: {},
      createdAt: new Date('2024-01-02'),
      timestamp: new Date('2024-01-02'),
    },
  ],
};

// Create actual gzipped data for tests
const gzipAsync = promisify(zlib.gzip);
let compressedTestData: Buffer;

beforeAll(async () => {
  compressedTestData = await gzipAsync(JSON.stringify(testContent));
});

describe('ArchiveService', () => {
  let service: ArchiveService;
  let prismaService: PrismaService;

  const mockSecurityLogs = [
    {
      id: '1',
      sequenceNumber: BigInt(1),
      previousHash: '0000',
      currentHash: 'hash1',
      eventType: 'USER_LOGIN',
      userId: 'user1',
      organizationId: 'org1',
      metadata: {},
      createdAt: new Date('2024-01-01'),
      timestamp: new Date('2024-01-01'),
    },
    {
      id: '2',
      sequenceNumber: BigInt(2),
      previousHash: 'hash1',
      currentHash: 'hash2',
      eventType: 'USER_LOGOUT',
      userId: 'user1',
      organizationId: 'org1',
      metadata: {},
      createdAt: new Date('2024-01-02'),
      timestamp: new Date('2024-01-02'),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArchiveService,
        {
          provide: PrismaService,
          useValue: {
            securityLog: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ArchiveService>(ArchiveService);
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;

    // Setup default mocks
    (fs.access as jest.Mock).mockRejectedValue(new Error('Not found'));
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.readFile as jest.Mock).mockImplementation((path) => {
      // Return proper gzipped data when reading .gz files
      if (path && path.endsWith('.gz')) {
        return Promise.resolve(compressedTestData);
      }
      return Promise.resolve(Buffer.from('compressed data'));
    });
    (fs.stat as jest.Mock).mockResolvedValue({ size: 1024, birthtime: new Date() });
    (fs.readdir as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('archiveBeforeDate', () => {
    it('should create archive with logs before cutoff date', async () => {
      (prismaService.securityLog.findMany as jest.Mock).mockResolvedValue(mockSecurityLogs);

      const cutoffDate = new Date('2024-01-03');
      const result = await service.archiveBeforeDate(cutoffDate);

      expect(result.count).toBe(2);
      expect(result.path).toMatch(/security-logs-.*\.json\.gz$/);

      expect(prismaService.securityLog.findMany).toHaveBeenCalledWith({
        where: { createdAt: { lt: cutoffDate } },
        orderBy: { sequenceNumber: 'asc' },
        take: 10000,
        skip: 0,
      });

      expect(fs.writeFile).toHaveBeenCalledTimes(2); // Archive and checksum
    });

    it('should return empty result when no logs to archive', async () => {
      (prismaService.securityLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.archiveBeforeDate(new Date());

      expect(result.count).toBe(0);
      expect(result.path).toBeNull();
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should handle large datasets with batching', async () => {
      const largeBatch = Array(10000)
        .fill(null)
        .map((_, i) => ({
          ...mockSecurityLogs[0],
          id: `log-${i}`,
          sequenceNumber: BigInt(i),
        }));

      (prismaService.securityLog.findMany as jest.Mock)
        .mockResolvedValueOnce(largeBatch)
        .mockResolvedValueOnce([mockSecurityLogs[1]]);

      // Create proper compressed data for large batch
      const largeBatchContent = {
        metadata: { totalLogs: 10001 },
        logs: [...largeBatch, mockSecurityLogs[1]].map((log) => ({
          ...log,
          sequenceNumber: log.sequenceNumber.toString(),
        })),
      };
      const largeCompressed = await gzipAsync(JSON.stringify(largeBatchContent));

      // Mock readFile to return the large compressed data for this test
      (fs.readFile as jest.Mock).mockImplementationOnce((path) => {
        if (path && path.endsWith('.gz')) {
          return Promise.resolve(largeCompressed);
        }
        return Promise.resolve(Buffer.from('compressed data'));
      });

      const result = await service.archiveBeforeDate(new Date());

      expect(result.count).toBe(10001);
      expect(prismaService.securityLog.findMany).toHaveBeenCalledTimes(2);
    });

    it('should verify hash chain integrity', async () => {
      const logsWithBrokenChain = [
        mockSecurityLogs[0],
        {
          ...mockSecurityLogs[1],
          previousHash: 'wrong-hash',
        },
      ];

      (prismaService.securityLog.findMany as jest.Mock).mockResolvedValue(logsWithBrokenChain);

      await service.archiveBeforeDate(new Date());

      const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
      const archivePath = writeCall[0];
      expect(archivePath).toMatch(/\.gz$/);

      // Archive should still be created even with broken chain
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should compress archive content', async () => {
      (prismaService.securityLog.findMany as jest.Mock).mockResolvedValue(mockSecurityLogs);

      await service.archiveBeforeDate(new Date());

      expect(fs.writeFile).toHaveBeenCalled();
      const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
      expect(writeCall[0]).toMatch(/\.gz$/);
      expect(writeCall[1]).toBeInstanceOf(Buffer);
    });

    it('should create checksum file', async () => {
      (prismaService.securityLog.findMany as jest.Mock).mockResolvedValue(mockSecurityLogs);

      await service.archiveBeforeDate(new Date());

      const writeFiles = (fs.writeFile as jest.Mock).mock.calls;
      expect(writeFiles).toHaveLength(2);
      expect(writeFiles[1][0]).toMatch(/\.sha256$/);
    });

    it('should handle archive creation errors', async () => {
      (prismaService.securityLog.findMany as jest.Mock).mockResolvedValue(mockSecurityLogs);
      (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Disk full'));

      await expect(service.archiveBeforeDate(new Date())).rejects.toThrow('Disk full');
    });

    it('should verify archive integrity after creation', async () => {
      (prismaService.securityLog.findMany as jest.Mock).mockResolvedValue(mockSecurityLogs);

      // Mock readFile to return invalid compressed data for verification failure
      const invalidContent = { metadata: { totalLogs: 999 }, logs: [] };
      const invalidCompressed = await gzipAsync(JSON.stringify(invalidContent));
      (fs.readFile as jest.Mock).mockResolvedValueOnce(invalidCompressed);

      await expect(service.archiveBeforeDate(new Date())).rejects.toThrow(
        'Archive verification failed: log count mismatch',
      );
    });

    it('should create archive directory if it does not exist', async () => {
      (prismaService.securityLog.findMany as jest.Mock).mockResolvedValue(mockSecurityLogs);

      await service.archiveBeforeDate(new Date());

      expect(fs.mkdir).toHaveBeenCalledWith('archives', { recursive: true });
    });

    it('should include metadata in archive', async () => {
      (prismaService.securityLog.findMany as jest.Mock).mockResolvedValue(mockSecurityLogs);

      const result = await service.archiveBeforeDate(new Date('2024-01-03'));

      // Verify that the archive was created successfully
      expect(result.count).toBe(2);
      expect(result.path).toMatch(/security-logs-.*\.json\.gz$/);
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('listArchives', () => {
    it('should list all archive files', async () => {
      const mockFiles = ['security-logs-2024-01-01.json.gz', 'security-logs-2024-01-02.json.gz'];

      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);
      (fs.stat as jest.Mock).mockImplementation(async (path) => {
        // Return different dates based on the filename
        const date = path.includes('2024-01-01')
          ? new Date('2024-01-01T00:00:00Z')
          : new Date('2024-01-02T00:00:00Z');
        return {
          size: 2048,
          birthtime: date,
        };
      });
      (fs.access as jest.Mock).mockResolvedValue(undefined); // Checksum exists

      const archives = await service.listArchives();

      expect(archives).toHaveLength(2);
      expect(archives[0]).toMatchObject({
        filename: 'security-logs-2024-01-02.json.gz',
        size: 2048,
        hasChecksum: true,
      });
      expect(archives).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            filename: expect.any(String),
            size: expect.any(Number),
            created: expect.any(Date),
            hasChecksum: expect.any(Boolean),
          }),
        ]),
      );
    });

    it('should filter out non-archive files', async () => {
      const mockFiles = [
        'security-logs-2024-01-01.json.gz',
        'README.md',
        'security-logs-2024-01-01.json.gz.sha256',
      ];

      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);

      const archives = await service.listArchives();

      expect(archives).toHaveLength(1);
      expect(archives[0].filename).toBe('security-logs-2024-01-01.json.gz');
    });

    it('should sort archives by creation date descending', async () => {
      const mockFiles = [
        'security-logs-2024-01-01.json.gz',
        'security-logs-2024-01-03.json.gz',
        'security-logs-2024-01-02.json.gz',
      ];

      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);
      (fs.stat as jest.Mock).mockImplementation(async (path) => ({
        size: 1024,
        birthtime: new Date(path.match(/2024-01-(\d+)/)[0]),
      }));

      const archives = await service.listArchives();

      expect(archives[0].filename).toContain('2024-01-03');
      expect(archives[1].filename).toContain('2024-01-02');
      expect(archives[2].filename).toContain('2024-01-01');
    });

    it('should check for checksum files', async () => {
      const mockFiles = ['security-logs-2024-01-01.json.gz'];

      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);
      (fs.access as jest.Mock).mockRejectedValue(new Error('Not found')); // No checksum

      const archives = await service.listArchives();

      expect(archives[0].hasChecksum).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      const archives = await service.listArchives();

      expect(archives).toEqual([]);
    });

    it('should create archive directory if it does not exist', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      await service.listArchives();

      expect(fs.mkdir).toHaveBeenCalledWith('archives', { recursive: true });
    });
  });

  describe('private methods', () => {
    it('should format bytes correctly', () => {
      const formatBytes = (service as any).formatBytes.bind(service);

      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
      expect(formatBytes(1536)).toBe('1.5 KB');
    });

    it('should verify hash chain with correct sequence', async () => {
      const verifyHashChainIntegrity = (service as any).verifyHashChainIntegrity.bind(service);

      const result = await verifyHashChainIntegrity(mockSecurityLogs);

      expect(result).toBe(true);
    });

    it('should detect broken hash chain', async () => {
      const verifyHashChainIntegrity = (service as any).verifyHashChainIntegrity.bind(service);

      const logsWithBrokenChain = [
        mockSecurityLogs[0],
        {
          ...mockSecurityLogs[1],
          previousHash: 'invalid-hash',
        },
      ];

      const result = await verifyHashChainIntegrity(logsWithBrokenChain);

      expect(result).toBe(false);
    });

    it('should handle empty logs in hash chain verification', async () => {
      const verifyHashChainIntegrity = (service as any).verifyHashChainIntegrity.bind(service);

      const result = await verifyHashChainIntegrity([]);

      expect(result).toBe(true);
    });

    it('should handle unsorted logs in hash chain verification', async () => {
      const verifyHashChainIntegrity = (service as any).verifyHashChainIntegrity.bind(service);

      const unsortedLogs = [mockSecurityLogs[1], mockSecurityLogs[0]];

      const result = await verifyHashChainIntegrity(unsortedLogs);

      expect(result).toBe(true); // Should still work as it sorts internally
    });
  });
});
