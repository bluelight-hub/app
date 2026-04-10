/**
 * Dependency Injection Tokens für Taktische-Zeichen Application Layer.
 *
 * Verwendet Symbol() für Compile-Time Type Safety und
 * Vermeidung von String-basierten Token Collisions.
 */

/** Repository Token für ITaktischesZeichenRepository */
export const TAKTISCHE_ZEICHEN_REPOSITORY = Symbol('ITaktischesZeichenRepository');

/** Repository Token für IZeichenKatalogRepository */
export const ZEICHEN_KATALOG_REPOSITORY = Symbol('IZeichenKatalogRepository');
