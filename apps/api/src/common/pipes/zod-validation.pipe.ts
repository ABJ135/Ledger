import { PipeTransform, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const message = result.error.errors
        .map((e) => `${e.path.join('.') || 'field'}: ${e.message}`)
        .join(', ');
      throw new BadRequestException(message);
    }
    return result.data;
  }
}
