/**
 * Mock für Prisma-Client für Tests
 */

export class PrismaClient {
    constructor() { }

    // Mock-Methoden können nach Bedarf hinzugefügt werden
    $connect() {
        return Promise.resolve();
    }

    $disconnect() {
        return Promise.resolve();
    }
}

// Mock-Typdeklarationen für Entities
export type EtbEntry = {
    id: string;
    // Weitere Felder nach Bedarf
};

export type EtbAttachment = {
    id: string;
    // Weitere Felder nach Bedarf
}; 