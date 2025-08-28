import { NotFoundException } from '@nestjs/common';

export class EinsatzNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Einsatz mit ID ${id} wurde nicht gefunden`);
  }
}
