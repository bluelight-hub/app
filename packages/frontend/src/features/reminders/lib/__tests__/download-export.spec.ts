/**
 * Unit Tests fuer download-export Utility
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * Testet den Blob-Download-Mechanismus via temporaerem Anchor-Element.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadExport } from '../download-export';

const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.URL.createObjectURL = mockCreateObjectURL;
  global.URL.revokeObjectURL = mockRevokeObjectURL;
});

describe('downloadExport', () => {
  it('should create object URL from blob', async () => {
    // Given
    const blob = new Blob(['test-content'], { type: 'text/plain' });
    const filename = 'export.txt';

    // When
    await downloadExport(blob, filename);

    // Then
    expect(mockCreateObjectURL).toHaveBeenCalledOnce();
    expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
  });

  it('should set download attribute to filename', async () => {
    // Given
    const blob = new Blob(['data'], { type: 'text/csv' });
    const filename = 'erinnerungen-export.csv';
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');

    // When
    await downloadExport(blob, filename);

    // Then
    const anchor = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.tagName).toBe('A');
    expect(anchor.download).toBe(filename);
    expect(anchor.href).toBe('blob:mock-url');

    appendChildSpy.mockRestore();
  });

  it('should click the anchor element', async () => {
    // Given
    const blob = new Blob(['data'], { type: 'text/plain' });
    const filename = 'export.txt';
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    // When
    await downloadExport(blob, filename);

    // Then
    expect(clickSpy).toHaveBeenCalledOnce();

    clickSpy.mockRestore();
  });

  it('should remove anchor and revoke URL after download', async () => {
    // Given
    const blob = new Blob(['data'], { type: 'text/plain' });
    const filename = 'export.txt';
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');

    // When
    await downloadExport(blob, filename);

    // Then
    const appendedAnchor = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(removeChildSpy).toHaveBeenCalledOnce();
    expect(removeChildSpy).toHaveBeenCalledWith(appendedAnchor);
    expect(mockRevokeObjectURL).toHaveBeenCalledOnce();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('should handle different file types (PDF blob with correct type)', async () => {
    // Given
    const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF magic bytes
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    const filename = 'bericht.pdf';
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');

    // When
    await downloadExport(blob, filename);

    // Then
    expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
    expect(blob.type).toBe('application/pdf');
    const anchor = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.download).toBe('bericht.pdf');

    appendChildSpy.mockRestore();
  });
});
