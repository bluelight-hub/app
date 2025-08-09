import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseNanoIdPipe implements PipeTransform<string, string> {
  constructor(private readonly length = 21) {}

  transform(value: string): string {
    if (typeof value !== 'string') {
      throw new BadRequestException('Validation failed (nanoid string expected)');
    }

    const isValid = value.length === this.length && /^[A-Za-z0-9_-]+$/.test(value);
    if (!isValid) {
      throw new BadRequestException(`Validation failed (nanoid length ${this.length} expected)`);
    }
    return value;
  }
}
