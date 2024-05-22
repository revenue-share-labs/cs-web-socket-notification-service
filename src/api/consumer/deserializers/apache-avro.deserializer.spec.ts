import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';

import { ApacheAvroDeserializer } from './apache-avro.deserializer';

describe('ApacheAvroDeserializer', () => {
  it('SchemaRegistry should be defined correctly', () => {
    const mockHost = 'http://localhost:8081';
    const apacheAvroDeserializer = new ApacheAvroDeserializer(mockHost);
    const expectedRegistry = new SchemaRegistry({ host: mockHost });

    expect(apacheAvroDeserializer['registry']['api']['_manifest'].host).toEqual(
      expectedRegistry['api']['_manifest'].host,
    );
  });
});
