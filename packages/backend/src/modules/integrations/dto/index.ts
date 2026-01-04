/**
 * Integrations DTOs.
 *
 * @module modules/integrations/dto
 */

export { HiOrgCredentialsResponseDto } from './hiorg-credentials-response.dto';
export { HiOrgConnectionInfoDto } from './hiorg-connection-info.dto';
export { HiOrgQualifikationPreviewItemDto, HiOrgPersonPreviewItemDto, HiOrgPersonsPreviewResponseDto } from './hiorg-persons-preview.dto';
export { InitiateOAuthResponseDto } from './initiate-oauth-response.dto';
// Story 7.2: Qualifikation-Mapping
export {
  QualifikationMappingItemDto,
  QualifikationMappingsResponseDto,
  SaveQualifikationMappingRequestDto,
  AutoMatchResultItemDto,
  AutoMatchResultResponseDto,
  AutoMatchRequestDto,
  BatchSaveMappingItemDto,
  BatchSaveQualifikationMappingsRequestDto,
  BatchSaveQualifikationMappingsResponseDto,
} from './qualifikation-mapping.dto';
// Story 7.2: Import
export { ImportPersonsRequestDto, ImportPersonResultItemDto, ImportPersonsResponseDto } from './import-persons.dto';
