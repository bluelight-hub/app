import { PartialType } from '@nestjs/swagger';
import { CreateIpWhitelistDto } from './create-ip-whitelist.dto';

export class UpdateIpWhitelistDto extends PartialType(CreateIpWhitelistDto) {}
