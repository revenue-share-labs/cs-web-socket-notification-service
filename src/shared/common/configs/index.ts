import { createProfiguration } from '@golevelup/profiguration';

type Config = {
  base: {
    port: number;
    serviceName: string;
    wsEventName: string;
  };
  cors: {
    enabled: boolean;
    methods: string[];
    origins: string[];
    credentials: boolean;
  };
  services: {
    jwtSecret: string;
    authUrl: string;
    userUrl: string;
    axiosTimeout: number;
    authRetryDelay: number;
    authUpdateEveryMin: number;
  };
  kafka: {
    clientId: string;
    brokers: string[];
    sslEnabled: boolean;
    consumer: {
      groupId: string;
      allowTopicCreation: boolean;
    };
    schemaRegistryUrl: string;
    notificationTopicName: string;
  };
  redis: {
    host: string;
    port: number;
    emitTimeout: number;
  };
  docs: {
    enabled: boolean;
    title: string;
    description: string;
    version: string;
    swaggerPath: string;
    asyncapiPath: string;
    wsExternalUrl: string;
  };
};

export const config = createProfiguration<Config>(
  {
    base: {
      port: {
        default: 3040,
        format: 'port',
        env: 'HTTP_PORT',
      },
      serviceName: {
        default: 'web-socket-notification-service',
        env: 'SERVICE_NAME',
      },
      wsEventName: {
        default: 'notification',
        env: 'WS_EVENT_NAME',
      },
    },
    cors: {
      enabled: {
        default: true,
        format: Boolean,
        env: 'CORS_ENABLED',
      },
      methods: {
        default: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        format: Array,
        env: 'CORS_METHODS',
      },
      origins: {
        default: ['http://localhost:3000'],
        format: Array,
        env: 'CORS_ORIGINS',
      },
      credentials: {
        default: true,
        format: Boolean,
        env: 'CORS_CREDENTIALS',
      },
    },
    services: {
      jwtSecret: {
        default: null,
        sensitive: true,
        format: String,
        env: 'INTERNAL_JWT_SECRET',
      },
      authUrl: {
        default: 'http://localhost:3010',
        env: 'AUTH_SERVICE_URL',
      },
      userUrl: {
        default: 'http://localhost:3030',
        env: 'USER_SERVICE_URL',
      },
      axiosTimeout: {
        default: 5000,
        format: 'nat',
        env: 'AXIOS_TIMEOUT',
      },
      authRetryDelay: {
        default: 5000,
        format: 'nat',
        env: 'AUTH_RETRY_DELAY',
      },
      authUpdateEveryMin: {
        default: 45,
        format: 'nat',
        env: 'AUTH_UPDATE_EVERY_MIN',
      },
    },
    kafka: {
      clientId: {
        default: 'web-socket-notification-service',
        env: 'KAFKA_CLIENT_ID',
      },
      brokers: {
        default: ['localhost:9092'],
        format: Array,
        env: 'KAFKA_BROKERS',
      },
      sslEnabled: {
        default: false,
        format: Boolean,
        env: 'KAFKA_SSL_ENABLED',
      },
      consumer: {
        groupId: {
          default: 'web-socket-notification-service',
          env: 'KAFKA_CONSUMER_GROUP_ID',
        },
        allowTopicCreation: {
          default: true,
          format: Boolean,
          env: 'KAFKA_CONSUMER_ALLOW_TOPIC_CREATION',
        },
      },
      schemaRegistryUrl: {
        default: 'http://localhost:8081',
        env: 'KAFKA_SCHEMA_REGISTRY_URL',
      },
      notificationTopicName: {
        default: 'user-notifications',
        env: 'KAFKA_NOTIFICATION_TOPIC',
      },
    },
    redis: {
      host: {
        default: 'localhost',
        env: 'REDIS_HOST',
      },
      port: {
        default: 6379,
        format: 'port',
        env: 'REDIS_PORT',
      },
      emitTimeout: {
        default: 5000,
        format: 'nat',
        env: 'REDIS_EMIT_TIMEOUT',
      },
    },
    docs: {
      enabled: {
        default: true,
        format: Boolean,
        env: 'DOCS_ENABLED',
      },
      title: {
        default: 'WebSocket Notification Service',
        env: 'DOCS_TITLE',
      },
      description: {
        default: 'This service manages user notifications via WebSocket',
        env: 'DOCS_DESCRIPTION',
      },
      version: {
        default: '1.0',
        env: 'DOCS_VERSION',
      },
      swaggerPath: {
        default: '/swagger',
        env: 'DOCS_SWAGGER_PATH',
      },
      asyncapiPath: {
        default: '/asyncapi',
        env: 'DOCS_ASYNCAPI_PATH',
      },
      wsExternalUrl: {
        default: 'ws://localhost:3040',
        env: 'DOCS_WS_EXTERNAL_URL',
      },
    },
  },
  {
    strict: true,
    // verbose: true,
    // loadRelativeTo: 'parent-module',
    configureEnv: (env = '') => ({
      strict: env !== 'production',
      files: `${
        env === 'production' ? `/etc/conf/contract-svc/.${env}.env` : `.${env}`
      }.env`,
    }),
  },
);
