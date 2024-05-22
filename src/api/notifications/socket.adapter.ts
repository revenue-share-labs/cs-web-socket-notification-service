import { ServerOptions } from 'socket.io';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { IoAdapter } from '@nestjs/platform-socket.io';

export class SocketAdapter extends IoAdapter {
  private cors: CorsOptions;

  setCors(cors: CorsOptions): void {
    this.cors = cors;
  }

  createIOServer(port: number, options?: ServerOptions): unknown {
    return super.createIOServer(port, { ...options, cors: this.cors });
  }
}
