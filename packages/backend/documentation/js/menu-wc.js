'use strict';

customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">@bluelight-hub/backend documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                        <li class="link">
                            <a href="index.html" data-type="chapter-link">
                                <span class="icon ion-ios-keypad"></span>Overview
                            </a>
                        </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                                <li class="link">
                                    <a href="properties.html" data-type="chapter-link">
                                        <span class="icon ion-ios-apps"></span>Properties
                                    </a>
                                </li>
                    </ul>
                </li>
                    <li class="chapter modules">
                        <a data-type="chapter-link" href="modules.html">
                            <div class="menu-toggler linked" data-bs-toggle="collapse" ${ isNormalMode ?
                                'data-bs-target="#modules-links"' : 'data-bs-target="#xs-modules-links"' }>
                                <span class="icon ion-ios-archive"></span>
                                <span class="link-name">Modules</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                        </a>
                        <ul class="links collapse " ${ isNormalMode ? 'id="modules-links"' : 'id="xs-modules-links"' }>
                            <li class="link">
                                <a href="modules/AppModule.html" data-type="entity-link" >AppModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/AuditModule.html" data-type="entity-link" >AuditModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-AuditModule-1db862aac4b40dee7029b566ee75da1474359e1482fe246c5e506498c49e12ab26335e36cd9b40927d01a154285414fafbd7abe272b37df14aaa13ea707cfff4"' : 'data-bs-target="#xs-controllers-links-module-AuditModule-1db862aac4b40dee7029b566ee75da1474359e1482fe246c5e506498c49e12ab26335e36cd9b40927d01a154285414fafbd7abe272b37df14aaa13ea707cfff4"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-AuditModule-1db862aac4b40dee7029b566ee75da1474359e1482fe246c5e506498c49e12ab26335e36cd9b40927d01a154285414fafbd7abe272b37df14aaa13ea707cfff4"' :
                                            'id="xs-controllers-links-module-AuditModule-1db862aac4b40dee7029b566ee75da1474359e1482fe246c5e506498c49e12ab26335e36cd9b40927d01a154285414fafbd7abe272b37df14aaa13ea707cfff4"' }>
                                            <li class="link">
                                                <a href="controllers/AuditLogController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuditLogController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-AuditModule-1db862aac4b40dee7029b566ee75da1474359e1482fe246c5e506498c49e12ab26335e36cd9b40927d01a154285414fafbd7abe272b37df14aaa13ea707cfff4"' : 'data-bs-target="#xs-injectables-links-module-AuditModule-1db862aac4b40dee7029b566ee75da1474359e1482fe246c5e506498c49e12ab26335e36cd9b40927d01a154285414fafbd7abe272b37df14aaa13ea707cfff4"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-AuditModule-1db862aac4b40dee7029b566ee75da1474359e1482fe246c5e506498c49e12ab26335e36cd9b40927d01a154285414fafbd7abe272b37df14aaa13ea707cfff4"' :
                                        'id="xs-injectables-links-module-AuditModule-1db862aac4b40dee7029b566ee75da1474359e1482fe246c5e506498c49e12ab26335e36cd9b40927d01a154285414fafbd7abe272b37df14aaa13ea707cfff4"' }>
                                        <li class="link">
                                            <a href="injectables/AuditInterceptor.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuditInterceptor</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/AuditLogBatchService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuditLogBatchService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/AuditLogCacheService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuditLogCacheService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/AuditLogQueue.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuditLogQueue</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/AuditLogSchedulerService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuditLogSchedulerService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/AuditLogService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuditLogService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/AuditLoggerUtil.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuditLoggerUtil</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/AuthModule.html" data-type="entity-link" >AuthModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-AuthModule-e462085d8f33217ef1a9a8b88f4ce953ff66334da9a2baba824b430eef9a23e0b79fa5af7f5b520f4f34d57754b00b7e2a05c900b59275deeaa3940d3d0dfdff"' : 'data-bs-target="#xs-controllers-links-module-AuthModule-e462085d8f33217ef1a9a8b88f4ce953ff66334da9a2baba824b430eef9a23e0b79fa5af7f5b520f4f34d57754b00b7e2a05c900b59275deeaa3940d3d0dfdff"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-AuthModule-e462085d8f33217ef1a9a8b88f4ce953ff66334da9a2baba824b430eef9a23e0b79fa5af7f5b520f4f34d57754b00b7e2a05c900b59275deeaa3940d3d0dfdff"' :
                                            'id="xs-controllers-links-module-AuthModule-e462085d8f33217ef1a9a8b88f4ce953ff66334da9a2baba824b430eef9a23e0b79fa5af7f5b520f4f34d57754b00b7e2a05c900b59275deeaa3940d3d0dfdff"' }>
                                            <li class="link">
                                                <a href="controllers/AuthController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuthController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/LoginAttemptController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >LoginAttemptController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/SecurityController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SecurityController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-AuthModule-e462085d8f33217ef1a9a8b88f4ce953ff66334da9a2baba824b430eef9a23e0b79fa5af7f5b520f4f34d57754b00b7e2a05c900b59275deeaa3940d3d0dfdff"' : 'data-bs-target="#xs-injectables-links-module-AuthModule-e462085d8f33217ef1a9a8b88f4ce953ff66334da9a2baba824b430eef9a23e0b79fa5af7f5b520f4f34d57754b00b7e2a05c900b59275deeaa3940d3d0dfdff"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-AuthModule-e462085d8f33217ef1a9a8b88f4ce953ff66334da9a2baba824b430eef9a23e0b79fa5af7f5b520f4f34d57754b00b7e2a05c900b59275deeaa3940d3d0dfdff"' :
                                        'id="xs-injectables-links-module-AuthModule-e462085d8f33217ef1a9a8b88f4ce953ff66334da9a2baba824b430eef9a23e0b79fa5af7f5b520f4f34d57754b00b7e2a05c900b59275deeaa3940d3d0dfdff"' }>
                                        <li class="link">
                                            <a href="injectables/AuthService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuthService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/GeoIpService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >GeoIpService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/JwtStrategy.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >JwtStrategy</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/LoginAttemptService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >LoginAttemptService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/PermissionValidationService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >PermissionValidationService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/PrismaService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >PrismaService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/SecurityAlertService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SecurityAlertService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/SecurityAlertServiceV2.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SecurityAlertServiceV2</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/SecurityLogService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SecurityLogService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/SecurityMetricsService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SecurityMetricsService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/SessionCleanupService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SessionCleanupService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/SuspiciousActivityService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SuspiciousActivityService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/CliModule.html" data-type="entity-link" >CliModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-CliModule-82830521ca8a2e987ffd2b5fedb4ef60484071141413ad7f7b7929555902e8996643ca115b7aae0e680028e8647fbe6b30569393e5b18cad8b5dd35e3b087e71"' : 'data-bs-target="#xs-injectables-links-module-CliModule-82830521ca8a2e987ffd2b5fedb4ef60484071141413ad7f7b7929555902e8996643ca115b7aae0e680028e8647fbe6b30569393e5b18cad8b5dd35e3b087e71"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-CliModule-82830521ca8a2e987ffd2b5fedb4ef60484071141413ad7f7b7929555902e8996643ca115b7aae0e680028e8647fbe6b30569393e5b18cad8b5dd35e3b087e71"' :
                                        'id="xs-injectables-links-module-CliModule-82830521ca8a2e987ffd2b5fedb4ef60484071141413ad7f7b7929555902e8996643ca115b7aae0e680028e8647fbe6b30569393e5b18cad8b5dd35e3b087e71"' }>
                                        <li class="link">
                                            <a href="injectables/SeedAdminCommand.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SeedAdminCommand</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/SeedEinsatzCommand.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SeedEinsatzCommand</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/SeedImportCommand.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SeedImportCommand</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/CommonModule.html" data-type="entity-link" >CommonModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-CommonModule-5ac89a3f7e6158298cded7463f13142c90e7981c6d6adbd446604ded7ca9c0a2759a730ebcdb350a24978633bd36baba98aa3bb954c5ba303b40b460691842d5"' : 'data-bs-target="#xs-injectables-links-module-CommonModule-5ac89a3f7e6158298cded7463f13142c90e7981c6d6adbd446604ded7ca9c0a2759a730ebcdb350a24978633bd36baba98aa3bb954c5ba303b40b460691842d5"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-CommonModule-5ac89a3f7e6158298cded7463f13142c90e7981c6d6adbd446604ded7ca9c0a2759a730ebcdb350a24978633bd36baba98aa3bb954c5ba303b40b460691842d5"' :
                                        'id="xs-injectables-links-module-CommonModule-5ac89a3f7e6158298cded7463f13142c90e7981c6d6adbd446604ded7ca9c0a2759a730ebcdb350a24978633bd36baba98aa3bb954c5ba303b40b460691842d5"' }>
                                        <li class="link">
                                            <a href="injectables/ErrorHandlingService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ErrorHandlingService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/PaginationService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >PaginationService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/ConfigModule.html" data-type="entity-link" >ConfigModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-ConfigModule-e33d603826c02a8d7d3be896dc933b8b3472d36c759f2250a82691e15cbd817159c6cbf8d0977c881ef4433d64d3c4953e31b2394292e72827711fb2ffe6aaa4"' : 'data-bs-target="#xs-injectables-links-module-ConfigModule-e33d603826c02a8d7d3be896dc933b8b3472d36c759f2250a82691e15cbd817159c6cbf8d0977c881ef4433d64d3c4953e31b2394292e72827711fb2ffe6aaa4"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-ConfigModule-e33d603826c02a8d7d3be896dc933b8b3472d36c759f2250a82691e15cbd817159c6cbf8d0977c881ef4433d64d3c4953e31b2394292e72827711fb2ffe6aaa4"' :
                                        'id="xs-injectables-links-module-ConfigModule-e33d603826c02a8d7d3be896dc933b8b3472d36c759f2250a82691e15cbd817159c6cbf8d0977c881ef4433d64d3c4953e31b2394292e72827711fb2ffe6aaa4"' }>
                                        <li class="link">
                                            <a href="injectables/DatabaseConfig.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >DatabaseConfig</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/EinsatzModule.html" data-type="entity-link" >EinsatzModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-EinsatzModule-b69c0e6cce0f09a36564e54047ea2632850c840c9e4606f45c454c66ef605dc4f424737dc0178e997f6fcc611db5020e8597fb84e558bfe26f490c2459ba9935"' : 'data-bs-target="#xs-controllers-links-module-EinsatzModule-b69c0e6cce0f09a36564e54047ea2632850c840c9e4606f45c454c66ef605dc4f424737dc0178e997f6fcc611db5020e8597fb84e558bfe26f490c2459ba9935"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-EinsatzModule-b69c0e6cce0f09a36564e54047ea2632850c840c9e4606f45c454c66ef605dc4f424737dc0178e997f6fcc611db5020e8597fb84e558bfe26f490c2459ba9935"' :
                                            'id="xs-controllers-links-module-EinsatzModule-b69c0e6cce0f09a36564e54047ea2632850c840c9e4606f45c454c66ef605dc4f424737dc0178e997f6fcc611db5020e8597fb84e558bfe26f490c2459ba9935"' }>
                                            <li class="link">
                                                <a href="controllers/EinsatzController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >EinsatzController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-EinsatzModule-b69c0e6cce0f09a36564e54047ea2632850c840c9e4606f45c454c66ef605dc4f424737dc0178e997f6fcc611db5020e8597fb84e558bfe26f490c2459ba9935"' : 'data-bs-target="#xs-injectables-links-module-EinsatzModule-b69c0e6cce0f09a36564e54047ea2632850c840c9e4606f45c454c66ef605dc4f424737dc0178e997f6fcc611db5020e8597fb84e558bfe26f490c2459ba9935"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-EinsatzModule-b69c0e6cce0f09a36564e54047ea2632850c840c9e4606f45c454c66ef605dc4f424737dc0178e997f6fcc611db5020e8597fb84e558bfe26f490c2459ba9935"' :
                                        'id="xs-injectables-links-module-EinsatzModule-b69c0e6cce0f09a36564e54047ea2632850c840c9e4606f45c454c66ef605dc4f424737dc0178e997f6fcc611db5020e8597fb84e558bfe26f490c2459ba9935"' }>
                                        <li class="link">
                                            <a href="injectables/EinsatzService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >EinsatzService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/EtbModule.html" data-type="entity-link" >EtbModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-EtbModule-d67ddeca25b89829976b2a32375cbc3cbb7b5c6b89ac9abacb684c8ea45a7288782fe75a3ed9dbad096e902f98f6ef89566f651441c658696b64c2505c2881f3"' : 'data-bs-target="#xs-controllers-links-module-EtbModule-d67ddeca25b89829976b2a32375cbc3cbb7b5c6b89ac9abacb684c8ea45a7288782fe75a3ed9dbad096e902f98f6ef89566f651441c658696b64c2505c2881f3"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-EtbModule-d67ddeca25b89829976b2a32375cbc3cbb7b5c6b89ac9abacb684c8ea45a7288782fe75a3ed9dbad096e902f98f6ef89566f651441c658696b64c2505c2881f3"' :
                                            'id="xs-controllers-links-module-EtbModule-d67ddeca25b89829976b2a32375cbc3cbb7b5c6b89ac9abacb684c8ea45a7288782fe75a3ed9dbad096e902f98f6ef89566f651441c658696b64c2505c2881f3"' }>
                                            <li class="link">
                                                <a href="controllers/EtbController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >EtbController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-EtbModule-d67ddeca25b89829976b2a32375cbc3cbb7b5c6b89ac9abacb684c8ea45a7288782fe75a3ed9dbad096e902f98f6ef89566f651441c658696b64c2505c2881f3"' : 'data-bs-target="#xs-injectables-links-module-EtbModule-d67ddeca25b89829976b2a32375cbc3cbb7b5c6b89ac9abacb684c8ea45a7288782fe75a3ed9dbad096e902f98f6ef89566f651441c658696b64c2505c2881f3"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-EtbModule-d67ddeca25b89829976b2a32375cbc3cbb7b5c6b89ac9abacb684c8ea45a7288782fe75a3ed9dbad096e902f98f6ef89566f651441c658696b64c2505c2881f3"' :
                                        'id="xs-injectables-links-module-EtbModule-d67ddeca25b89829976b2a32375cbc3cbb7b5c6b89ac9abacb684c8ea45a7288782fe75a3ed9dbad096e902f98f6ef89566f651441c658696b64c2505c2881f3"' }>
                                        <li class="link">
                                            <a href="injectables/EtbService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >EtbService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/HealthModule.html" data-type="entity-link" >HealthModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-HealthModule-96de7cd49fe6bd74e5b16594566b8db400fe5be5d6f1c9f7d70ae1b9ca9aab9bd89cd643c05c69383da4c7e5d138f5d2cca892b16d3ed342617311e101db95aa"' : 'data-bs-target="#xs-controllers-links-module-HealthModule-96de7cd49fe6bd74e5b16594566b8db400fe5be5d6f1c9f7d70ae1b9ca9aab9bd89cd643c05c69383da4c7e5d138f5d2cca892b16d3ed342617311e101db95aa"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-HealthModule-96de7cd49fe6bd74e5b16594566b8db400fe5be5d6f1c9f7d70ae1b9ca9aab9bd89cd643c05c69383da4c7e5d138f5d2cca892b16d3ed342617311e101db95aa"' :
                                            'id="xs-controllers-links-module-HealthModule-96de7cd49fe6bd74e5b16594566b8db400fe5be5d6f1c9f7d70ae1b9ca9aab9bd89cd643c05c69383da4c7e5d138f5d2cca892b16d3ed342617311e101db95aa"' }>
                                            <li class="link">
                                                <a href="controllers/HealthController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >HealthController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-HealthModule-96de7cd49fe6bd74e5b16594566b8db400fe5be5d6f1c9f7d70ae1b9ca9aab9bd89cd643c05c69383da4c7e5d138f5d2cca892b16d3ed342617311e101db95aa"' : 'data-bs-target="#xs-injectables-links-module-HealthModule-96de7cd49fe6bd74e5b16594566b8db400fe5be5d6f1c9f7d70ae1b9ca9aab9bd89cd643c05c69383da4c7e5d138f5d2cca892b16d3ed342617311e101db95aa"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-HealthModule-96de7cd49fe6bd74e5b16594566b8db400fe5be5d6f1c9f7d70ae1b9ca9aab9bd89cd643c05c69383da4c7e5d138f5d2cca892b16d3ed342617311e101db95aa"' :
                                        'id="xs-injectables-links-module-HealthModule-96de7cd49fe6bd74e5b16594566b8db400fe5be5d6f1c9f7d70ae1b9ca9aab9bd89cd643c05c69383da4c7e5d138f5d2cca892b16d3ed342617311e101db95aa"' }>
                                        <li class="link">
                                            <a href="injectables/PrismaHealthIndicator.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >PrismaHealthIndicator</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/NotificationModule.html" data-type="entity-link" >NotificationModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-NotificationModule-47dcf92702d50fded3e1b7cb6e781952f22928639ca337edf1f90b4331b93f13ea05d1812a2d88f6febb59eb7913efcf6fba2980588fc74bcee0c54b831dbc6a"' : 'data-bs-target="#xs-controllers-links-module-NotificationModule-47dcf92702d50fded3e1b7cb6e781952f22928639ca337edf1f90b4331b93f13ea05d1812a2d88f6febb59eb7913efcf6fba2980588fc74bcee0c54b831dbc6a"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-NotificationModule-47dcf92702d50fded3e1b7cb6e781952f22928639ca337edf1f90b4331b93f13ea05d1812a2d88f6febb59eb7913efcf6fba2980588fc74bcee0c54b831dbc6a"' :
                                            'id="xs-controllers-links-module-NotificationModule-47dcf92702d50fded3e1b7cb6e781952f22928639ca337edf1f90b4331b93f13ea05d1812a2d88f6febb59eb7913efcf6fba2980588fc74bcee0c54b831dbc6a"' }>
                                            <li class="link">
                                                <a href="controllers/NotificationController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >NotificationController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-NotificationModule-47dcf92702d50fded3e1b7cb6e781952f22928639ca337edf1f90b4331b93f13ea05d1812a2d88f6febb59eb7913efcf6fba2980588fc74bcee0c54b831dbc6a"' : 'data-bs-target="#xs-injectables-links-module-NotificationModule-47dcf92702d50fded3e1b7cb6e781952f22928639ca337edf1f90b4331b93f13ea05d1812a2d88f6febb59eb7913efcf6fba2980588fc74bcee0c54b831dbc6a"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-NotificationModule-47dcf92702d50fded3e1b7cb6e781952f22928639ca337edf1f90b4331b93f13ea05d1812a2d88f6febb59eb7913efcf6fba2980588fc74bcee0c54b831dbc6a"' :
                                        'id="xs-injectables-links-module-NotificationModule-47dcf92702d50fded3e1b7cb6e781952f22928639ca337edf1f90b4331b93f13ea05d1812a2d88f6febb59eb7913efcf6fba2980588fc74bcee0c54b831dbc6a"' }>
                                        <li class="link">
                                            <a href="injectables/EmailChannel.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >EmailChannel</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/NotificationHealthService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >NotificationHealthService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/NotificationQueue.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >NotificationQueue</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/NotificationService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >NotificationService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/NotificationTemplateService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >NotificationTemplateService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/WebhookChannel.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >WebhookChannel</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/PrismaModule.html" data-type="entity-link" >PrismaModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-PrismaModule-2e959392d94a8d2afa265d166e9fb37590c6d01befda441ee1100570c6e49e924a54f5eb6923cf6474a9fb52da77d0990b5c71b910c22e1aba57ddfc0e67fa45"' : 'data-bs-target="#xs-injectables-links-module-PrismaModule-2e959392d94a8d2afa265d166e9fb37590c6d01befda441ee1100570c6e49e924a54f5eb6923cf6474a9fb52da77d0990b5c71b910c22e1aba57ddfc0e67fa45"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-PrismaModule-2e959392d94a8d2afa265d166e9fb37590c6d01befda441ee1100570c6e49e924a54f5eb6923cf6474a9fb52da77d0990b5c71b910c22e1aba57ddfc0e67fa45"' :
                                        'id="xs-injectables-links-module-PrismaModule-2e959392d94a8d2afa265d166e9fb37590c6d01befda441ee1100570c6e49e924a54f5eb6923cf6474a9fb52da77d0990b5c71b910c22e1aba57ddfc0e67fa45"' }>
                                        <li class="link">
                                            <a href="injectables/PrismaService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >PrismaService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/SeedModule.html" data-type="entity-link" >SeedModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-SeedModule-17d2ce598669a589b64ffd84a35fc4cc7afe68fb9f0e11d4874e32f49db92985ed8ee1fafb7e532666016bf2606884d0e03e5f692df5f179320304963e97beb1"' : 'data-bs-target="#xs-injectables-links-module-SeedModule-17d2ce598669a589b64ffd84a35fc4cc7afe68fb9f0e11d4874e32f49db92985ed8ee1fafb7e532666016bf2606884d0e03e5f692df5f179320304963e97beb1"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-SeedModule-17d2ce598669a589b64ffd84a35fc4cc7afe68fb9f0e11d4874e32f49db92985ed8ee1fafb7e532666016bf2606884d0e03e5f692df5f179320304963e97beb1"' :
                                        'id="xs-injectables-links-module-SeedModule-17d2ce598669a589b64ffd84a35fc4cc7afe68fb9f0e11d4874e32f49db92985ed8ee1fafb7e532666016bf2606884d0e03e5f692df5f179320304963e97beb1"' }>
                                        <li class="link">
                                            <a href="injectables/DatabaseCheckService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >DatabaseCheckService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/DevSeedService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >DevSeedService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/ProfileService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ProfileService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/SeedImportService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SeedImportService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/SeedService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SeedService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/SessionModule.html" data-type="entity-link" >SessionModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-SessionModule-670222ddf8bc6a6e7e94d7cda5e27a8617776d53788be0710b0fa31f039e6755f1db121a25ee212e224733bcaf2aea0386f79231247977d7319f0656422456a8"' : 'data-bs-target="#xs-controllers-links-module-SessionModule-670222ddf8bc6a6e7e94d7cda5e27a8617776d53788be0710b0fa31f039e6755f1db121a25ee212e224733bcaf2aea0386f79231247977d7319f0656422456a8"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-SessionModule-670222ddf8bc6a6e7e94d7cda5e27a8617776d53788be0710b0fa31f039e6755f1db121a25ee212e224733bcaf2aea0386f79231247977d7319f0656422456a8"' :
                                            'id="xs-controllers-links-module-SessionModule-670222ddf8bc6a6e7e94d7cda5e27a8617776d53788be0710b0fa31f039e6755f1db121a25ee212e224733bcaf2aea0386f79231247977d7319f0656422456a8"' }>
                                            <li class="link">
                                                <a href="controllers/SessionController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SessionController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-SessionModule-670222ddf8bc6a6e7e94d7cda5e27a8617776d53788be0710b0fa31f039e6755f1db121a25ee212e224733bcaf2aea0386f79231247977d7319f0656422456a8"' : 'data-bs-target="#xs-injectables-links-module-SessionModule-670222ddf8bc6a6e7e94d7cda5e27a8617776d53788be0710b0fa31f039e6755f1db121a25ee212e224733bcaf2aea0386f79231247977d7319f0656422456a8"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-SessionModule-670222ddf8bc6a6e7e94d7cda5e27a8617776d53788be0710b0fa31f039e6755f1db121a25ee212e224733bcaf2aea0386f79231247977d7319f0656422456a8"' :
                                        'id="xs-injectables-links-module-SessionModule-670222ddf8bc6a6e7e94d7cda5e27a8617776d53788be0710b0fa31f039e6755f1db121a25ee212e224733bcaf2aea0386f79231247977d7319f0656422456a8"' }>
                                        <li class="link">
                                            <a href="injectables/SessionService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SessionService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                </ul>
                </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#controllers-links"' :
                                'data-bs-target="#xs-controllers-links"' }>
                                <span class="icon ion-md-swap"></span>
                                <span>Controllers</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="controllers-links"' : 'id="xs-controllers-links"' }>
                                <li class="link">
                                    <a href="controllers/AuditLogController.html" data-type="entity-link" >AuditLogController</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#classes-links"' :
                            'data-bs-target="#xs-classes-links"' }>
                            <span class="icon ion-ios-paper"></span>
                            <span>Classes</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="classes-links"' : 'id="xs-classes-links"' }>
                            <li class="link">
                                <a href="classes/AccountDisabledException.html" data-type="entity-link" >AccountDisabledException</a>
                            </li>
                            <li class="link">
                                <a href="classes/AccountLockedException.html" data-type="entity-link" >AccountLockedException</a>
                            </li>
                            <li class="link">
                                <a href="classes/AddAttachmentDto.html" data-type="entity-link" >AddAttachmentDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/ApiMeta.html" data-type="entity-link" >ApiMeta</a>
                            </li>
                            <li class="link">
                                <a href="classes/ApiResponse.html" data-type="entity-link" >ApiResponse</a>
                            </li>
                            <li class="link">
                                <a href="classes/AuditContextUtil.html" data-type="entity-link" >AuditContextUtil</a>
                            </li>
                            <li class="link">
                                <a href="classes/AuditLogEntity.html" data-type="entity-link" >AuditLogEntity</a>
                            </li>
                            <li class="link">
                                <a href="classes/AuditLogProcessor.html" data-type="entity-link" >AuditLogProcessor</a>
                            </li>
                            <li class="link">
                                <a href="classes/AuditLogStatisticsResponse.html" data-type="entity-link" >AuditLogStatisticsResponse</a>
                            </li>
                            <li class="link">
                                <a href="classes/AuthException.html" data-type="entity-link" >AuthException</a>
                            </li>
                            <li class="link">
                                <a href="classes/AuthUserDto.html" data-type="entity-link" >AuthUserDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/CircuitBreaker.html" data-type="entity-link" >CircuitBreaker</a>
                            </li>
                            <li class="link">
                                <a href="classes/ConsolaLogger.html" data-type="entity-link" >ConsolaLogger</a>
                            </li>
                            <li class="link">
                                <a href="classes/CreateAuditLogDto.html" data-type="entity-link" >CreateAuditLogDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/CreateEinsatzDto.html" data-type="entity-link" >CreateEinsatzDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/CreateEtbDto.html" data-type="entity-link" >CreateEtbDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/CreateLoginAttemptDto.html" data-type="entity-link" >CreateLoginAttemptDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/CreateSessionActivityDto.html" data-type="entity-link" >CreateSessionActivityDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/DuplicateDetectionUtil.html" data-type="entity-link" >DuplicateDetectionUtil</a>
                            </li>
                            <li class="link">
                                <a href="classes/Einsatz.html" data-type="entity-link" >Einsatz</a>
                            </li>
                            <li class="link">
                                <a href="classes/EtbAttachment.html" data-type="entity-link" >EtbAttachment</a>
                            </li>
                            <li class="link">
                                <a href="classes/EtbAttachment-1.html" data-type="entity-link" >EtbAttachment</a>
                            </li>
                            <li class="link">
                                <a href="classes/EtbAttachmentResponse.html" data-type="entity-link" >EtbAttachmentResponse</a>
                            </li>
                            <li class="link">
                                <a href="classes/EtbAttachmentsResponse.html" data-type="entity-link" >EtbAttachmentsResponse</a>
                            </li>
                            <li class="link">
                                <a href="classes/EtbEntriesData.html" data-type="entity-link" >EtbEntriesData</a>
                            </li>
                            <li class="link">
                                <a href="classes/EtbEntriesResponse.html" data-type="entity-link" >EtbEntriesResponse</a>
                            </li>
                            <li class="link">
                                <a href="classes/EtbEntry.html" data-type="entity-link" >EtbEntry</a>
                            </li>
                            <li class="link">
                                <a href="classes/EtbEntryDto.html" data-type="entity-link" >EtbEntryDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/EtbEntryResponse.html" data-type="entity-link" >EtbEntryResponse</a>
                            </li>
                            <li class="link">
                                <a href="classes/FilterEtbDto.html" data-type="entity-link" >FilterEtbDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/FilterPaginationDto.html" data-type="entity-link" >FilterPaginationDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/InvalidCredentialsException.html" data-type="entity-link" >InvalidCredentialsException</a>
                            </li>
                            <li class="link">
                                <a href="classes/InvalidSessionException.html" data-type="entity-link" >InvalidSessionException</a>
                            </li>
                            <li class="link">
                                <a href="classes/InvalidTokenException.html" data-type="entity-link" >InvalidTokenException</a>
                            </li>
                            <li class="link">
                                <a href="classes/LoginAttemptDto.html" data-type="entity-link" >LoginAttemptDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/LoginAttemptStatsDto.html" data-type="entity-link" >LoginAttemptStatsDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/LoginDto.html" data-type="entity-link" >LoginDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/LoginResponseDto.html" data-type="entity-link" >LoginResponseDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/NotificationProcessor.html" data-type="entity-link" >NotificationProcessor</a>
                            </li>
                            <li class="link">
                                <a href="classes/PaginatedAuditLogResponse.html" data-type="entity-link" >PaginatedAuditLogResponse</a>
                            </li>
                            <li class="link">
                                <a href="classes/PaginatedResponse.html" data-type="entity-link" >PaginatedResponse</a>
                            </li>
                            <li class="link">
                                <a href="classes/PaginationMeta.html" data-type="entity-link" >PaginationMeta</a>
                            </li>
                            <li class="link">
                                <a href="classes/ProfileUtils.html" data-type="entity-link" >ProfileUtils</a>
                            </li>
                            <li class="link">
                                <a href="classes/QueryAuditLogDto.html" data-type="entity-link" >QueryAuditLogDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/RefreshRateLimitExceededException.html" data-type="entity-link" >RefreshRateLimitExceededException</a>
                            </li>
                            <li class="link">
                                <a href="classes/RefreshTokenDto.html" data-type="entity-link" >RefreshTokenDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/RetryUtil.html" data-type="entity-link" >RetryUtil</a>
                            </li>
                            <li class="link">
                                <a href="classes/SchemaValidator.html" data-type="entity-link" >SchemaValidator</a>
                            </li>
                            <li class="link">
                                <a href="classes/SessionActivityDto.html" data-type="entity-link" >SessionActivityDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/SessionActivityException.html" data-type="entity-link" >SessionActivityException</a>
                            </li>
                            <li class="link">
                                <a href="classes/SessionDto.html" data-type="entity-link" >SessionDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/SessionExpiredException.html" data-type="entity-link" >SessionExpiredException</a>
                            </li>
                            <li class="link">
                                <a href="classes/SessionFilterDto.html" data-type="entity-link" >SessionFilterDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/SessionLimitExceededException.html" data-type="entity-link" >SessionLimitExceededException</a>
                            </li>
                            <li class="link">
                                <a href="classes/SessionLimitExceededException-1.html" data-type="entity-link" >SessionLimitExceededException</a>
                            </li>
                            <li class="link">
                                <a href="classes/SessionNotFoundException.html" data-type="entity-link" >SessionNotFoundException</a>
                            </li>
                            <li class="link">
                                <a href="classes/SessionRevokedException.html" data-type="entity-link" >SessionRevokedException</a>
                            </li>
                            <li class="link">
                                <a href="classes/SessionRiskDetectedException.html" data-type="entity-link" >SessionRiskDetectedException</a>
                            </li>
                            <li class="link">
                                <a href="classes/SessionStatisticsDto.html" data-type="entity-link" >SessionStatisticsDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/TokenExpiredException.html" data-type="entity-link" >TokenExpiredException</a>
                            </li>
                            <li class="link">
                                <a href="classes/TokenResponseDto.html" data-type="entity-link" >TokenResponseDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/TokenRevokedException.html" data-type="entity-link" >TokenRevokedException</a>
                            </li>
                            <li class="link">
                                <a href="classes/UeberschreibeEtbDto.html" data-type="entity-link" >UeberschreibeEtbDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/UpdateEtbDto.html" data-type="entity-link" >UpdateEtbDto</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#injectables-links"' :
                                'data-bs-target="#xs-injectables-links"' }>
                                <span class="icon ion-md-arrow-round-down"></span>
                                <span>Injectables</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="injectables-links"' : 'id="xs-injectables-links"' }>
                                <li class="link">
                                    <a href="injectables/AuditLogBatchService.html" data-type="entity-link" >AuditLogBatchService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AuditLogCacheService.html" data-type="entity-link" >AuditLogCacheService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AuditLoggerUtil.html" data-type="entity-link" >AuditLoggerUtil</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AuditLogQueue.html" data-type="entity-link" >AuditLogQueue</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AuditLogSchedulerService.html" data-type="entity-link" >AuditLogSchedulerService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AuditLogService.html" data-type="entity-link" >AuditLogService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/JwtAuthGuard.html" data-type="entity-link" >JwtAuthGuard</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/JwtStrategy.html" data-type="entity-link" >JwtStrategy</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#guards-links"' :
                            'data-bs-target="#xs-guards-links"' }>
                            <span class="icon ion-ios-lock"></span>
                            <span>Guards</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="guards-links"' : 'id="xs-guards-links"' }>
                            <li class="link">
                                <a href="guards/EinsatzExistsGuard.html" data-type="entity-link" >EinsatzExistsGuard</a>
                            </li>
                            <li class="link">
                                <a href="guards/IpAllowlistGuard.html" data-type="entity-link" >IpAllowlistGuard</a>
                            </li>
                            <li class="link">
                                <a href="guards/PermissionsGuard.html" data-type="entity-link" >PermissionsGuard</a>
                            </li>
                            <li class="link">
                                <a href="guards/RolesGuard.html" data-type="entity-link" >RolesGuard</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#interfaces-links"' :
                            'data-bs-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/AuditInterceptorConfig.html" data-type="entity-link" >AuditInterceptorConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AuditLogInput.html" data-type="entity-link" >AuditLogInput</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AuditLogJobData.html" data-type="entity-link" >AuditLogJobData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AuditMetadata.html" data-type="entity-link" >AuditMetadata</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AuditOptions.html" data-type="entity-link" >AuditOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AuditRequest.html" data-type="entity-link" >AuditRequest</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AuthConfig.html" data-type="entity-link" >AuthConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AuthUser.html" data-type="entity-link" >AuthUser</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/BaseSeedEntity.html" data-type="entity-link" >BaseSeedEntity</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/BatchResult.html" data-type="entity-link" >BatchResult</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ChannelHealthInfo.html" data-type="entity-link" >ChannelHealthInfo</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CircuitBreakerConfig.html" data-type="entity-link" >CircuitBreakerConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/DeviceInfo.html" data-type="entity-link" >DeviceInfo</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/DuplicateDetectionConfig.html" data-type="entity-link" >DuplicateDetectionConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/EnvironmentErrorConfig.html" data-type="entity-link" >EnvironmentErrorConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ErrorHandlingFeatureFlags.html" data-type="entity-link" >ErrorHandlingFeatureFlags</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ErrorMetrics.html" data-type="entity-link" >ErrorMetrics</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/GeoIpInfo.html" data-type="entity-link" >GeoIpInfo</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ImportConfig.html" data-type="entity-link" >ImportConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ImportResult.html" data-type="entity-link" >ImportResult</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/JWTPayload.html" data-type="entity-link" >JWTPayload</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/JWTRefreshPayload.html" data-type="entity-link" >JWTRefreshPayload</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/LocationInfo.html" data-type="entity-link" >LocationInfo</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/LoginRequest.html" data-type="entity-link" >LoginRequest</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/LoginResponse.html" data-type="entity-link" >LoginResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MulterFile.html" data-type="entity-link" >MulterFile</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/NotificationChannel.html" data-type="entity-link" >NotificationChannel</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/NotificationPayload.html" data-type="entity-link" >NotificationPayload</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/NotificationRecipient.html" data-type="entity-link" >NotificationRecipient</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OperationMetadata.html" data-type="entity-link" >OperationMetadata</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PermissionReport.html" data-type="entity-link" >PermissionReport</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RefreshTokenRequest.html" data-type="entity-link" >RefreshTokenRequest</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RequestWithUser.html" data-type="entity-link" >RequestWithUser</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RetentionConfig.html" data-type="entity-link" >RetentionConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RetryConfig.html" data-type="entity-link" >RetryConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SecurityAlertPayload.html" data-type="entity-link" >SecurityAlertPayload</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SecurityAlertPayload-1.html" data-type="entity-link" >SecurityAlertPayload</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SeedAdminOptions.html" data-type="entity-link" >SeedAdminOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SeedData.html" data-type="entity-link" >SeedData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SeedEinsatz.html" data-type="entity-link" >SeedEinsatz</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SeedEinsatzOptions.html" data-type="entity-link" >SeedEinsatzOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SeedEtbAttachment.html" data-type="entity-link" >SeedEtbAttachment</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SeedEtbEntry.html" data-type="entity-link" >SeedEtbEntry</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SeedImportOptions.html" data-type="entity-link" >SeedImportOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SeedModuleOptions.html" data-type="entity-link" >SeedModuleOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SeedProfile.html" data-type="entity-link" >SeedProfile</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Session.html" data-type="entity-link" >Session</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SessionHeartbeatData.html" data-type="entity-link" >SessionHeartbeatData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SessionMetrics.html" data-type="entity-link" >SessionMetrics</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SessionRiskFactors.html" data-type="entity-link" >SessionRiskFactors</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SessionWebSocketPayload.html" data-type="entity-link" >SessionWebSocketPayload</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SessionWithActivities.html" data-type="entity-link" >SessionWithActivities</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SessionWithDetails.html" data-type="entity-link" >SessionWithDetails</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SessionWithUser.html" data-type="entity-link" >SessionWithUser</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SimpleSeedData.html" data-type="entity-link" >SimpleSeedData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TokenResponse.html" data-type="entity-link" >TokenResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UserContext.html" data-type="entity-link" >UserContext</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ValidationError.html" data-type="entity-link" >ValidationError</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ValidationReport.html" data-type="entity-link" >ValidationReport</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ValidationResult.html" data-type="entity-link" >ValidationResult</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ValidationWarning.html" data-type="entity-link" >ValidationWarning</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#miscellaneous-links"'
                            : 'data-bs-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/enumerations.html" data-type="entity-link">Enums</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/functions.html" data-type="entity-link">Functions</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/typealiases.html" data-type="entity-link">Type aliases</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>Documentation coverage</a>
                    </li>
                    <li class="divider"></li>
                    <li class="copyright">
                        Documentation generated using <a href="https://compodoc.app/" target="_blank" rel="noopener noreferrer">
                            <img data-src="images/compodoc-vectorise.png" class="img-responsive" data-type="compodoc-logo">
                        </a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});