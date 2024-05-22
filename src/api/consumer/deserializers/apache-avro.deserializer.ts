import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { ConsumerDeserializer, IncomingEvent } from '@nestjs/microservices';
import { KafkaMessage } from '@nestjs/microservices/external/kafka.interface';

export class ApacheAvroDeserializer implements ConsumerDeserializer {
  private registry: SchemaRegistry;

  constructor(host: string) {
    this.registry = new SchemaRegistry({ host });
  }

  async deserialize(
    value: KafkaMessage,
    options?: Record<string, unknown>,
  ): Promise<IncomingEvent> {
    let data;

    if (value.value) {
      data = await this.registry.decode(value.value);
    }

    return {
      pattern: options?.['channel'],
      data,
    };
  }
}
