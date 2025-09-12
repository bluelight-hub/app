# Story 1.0: WebSocket Infrastructure Setup

## Story Details
- **Story ID**: ETB-1.0
- **Epic**: Digitales Einsatztagebuch mit Einsatzvollansicht
- **Priority**: HIGH
- **Story Points**: 2
- **Sprint**: Phase 1

## User Story
**Als** Entwickler  
**möchte ich** die WebSocket-Infrastruktur vorbereiten  
**damit** Real-time Features später implementiert werden können

## Acceptance Criteria
- [ ] Socket.io Server-Package installiert (`@nestjs/websockets`, `@nestjs/platform-socket.io`)
- [ ] Socket.io Client-Package installiert (`socket.io-client`)
- [ ] Basic WebSocket Gateway Template erstellt
- [ ] Connection Test implementiert
- [ ] Environment Variables für WebSocket-Config
- [ ] CORS-Settings für WebSocket konfiguriert
- [ ] Dokumentation der WebSocket-Architecture

## Technical Requirements
```bash
# Backend Dependencies
pnpm add --filter @bluelight-hub/backend @nestjs/websockets @nestjs/platform-socket.io socket.io

# Frontend Dependencies  
pnpm add --filter @bluelight-hub/frontend socket.io-client

# Environment Variables
ENABLE_WEBSOCKET=true
WEBSOCKET_PORT=3001
WEBSOCKET_CORS_ORIGIN=http://localhost:5173
```

```typescript
// Basic Gateway Template
// packages/backend/src/common/gateways/base.gateway.ts
@WebSocketGateway({
  cors: {
    origin: process.env.WEBSOCKET_CORS_ORIGIN,
    credentials: true,
  },
})
export class BaseGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('BaseGateway');

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }
}
```

## Definition of Done
- [ ] Dependencies installiert und package.json aktualisiert
- [ ] Base Gateway Template funktioniert
- [ ] Connection Test erfolgreich
- [ ] Environment Variables dokumentiert
- [ ] Rollback durch Environment Variable möglich

## Rollback Strategy
- [ ] `ENABLE_WEBSOCKET=false` deaktiviert alle WebSocket-Features
- [ ] Keine Breaking Changes für bestehende REST-API
- [ ] Dependencies können ohne Seiteneffekte entfernt werden

## Dependencies
- Keine (Foundation Story)

## Notes
- Nur Setup, keine Feature-Implementation
- Wird von ETB-1.8 (Real-time Updates) genutzt
- Performance-Monitoring vorbereiten für spätere Load-Tests