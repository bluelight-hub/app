import { ApiProperty } from '@nestjs/swagger';

export class ServerInfoDto {
  @ApiProperty({
    description: 'Server Name',
    example: 'Feuerwehr Musterstadt',
  })
  name!: string;

  @ApiProperty({ description: 'Server Version', example: '1.0.0' })
  version!: string;

  @ApiProperty({
    description: 'Server Base URL',
    example: 'https://api.example.de',
  })
  baseUrl!: string;
}

export class ExchangeInviteResponseDto {
  @ApiProperty({
    description: 'Das generierte Server-Access-Token (nur einmal sichtbar!)',
    example: 'blh_clx9k2j3m0000abc123xyz',
  })
  accessToken!: string;

  @ApiProperty({ description: 'Server-Informationen', type: ServerInfoDto })
  serverInfo!: ServerInfoDto;
}
