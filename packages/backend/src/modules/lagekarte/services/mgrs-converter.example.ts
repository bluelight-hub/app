/**
 * MGRS Converter Service - Usage Examples
 *
 * Dieses Skript demonstriert die Verwendung des MgrsConverterService
 * für die Konvertierung zwischen geografischen Koordinaten und MGRS Format.
 */

import { MgrsConverterService } from './mgrs-converter.service';

// Service initialisieren
const mgrsConverter = new MgrsConverterService();

console.log('=== MGRS Converter Service Examples ===\n');

// Example 1: LatLng zu MGRS mit verschiedenen Precision-Levels
console.log('1. LatLng → MGRS (verschiedene Precision-Levels)');
console.log('Berlin Brandenburger Tor: (52.516275, 13.377704)');
for (let precision = 0; precision <= 5; precision++) {
  const mgrs = mgrsConverter.latLngToMgrs(52.516275, 13.377704, precision);
  console.log(`  Precision ${precision} (${10 ** (5 - precision)}m): ${mgrs}`);
}
console.log();

// Example 2: MGRS zu LatLng
console.log('2. MGRS → LatLng');
const testMgrs = '33UUU9185320652';
const coords = mgrsConverter.mgrsToLatLng(testMgrs);
console.log(`  ${testMgrs} →`);
console.log(`  Latitude:  ${coords.latitude}`);
console.log(`  Longitude: ${coords.longitude}`);
console.log();

// Example 3: Round-Trip Konvertierung
console.log('3. Round-Trip Test (LatLng → MGRS → LatLng)');
const originalLat = 52.516275;
const originalLng = 13.377704;
const mgrsString = mgrsConverter.latLngToMgrs(originalLat, originalLng, 5);
const backToCoords = mgrsConverter.mgrsToLatLng(mgrsString);
console.log(`  Original:  (${originalLat}, ${originalLng})`);
console.log(`  MGRS:      ${mgrsString}`);
console.log(`  Zurück:    (${backToCoords.latitude}, ${backToCoords.longitude})`);
console.log(`  Differenz: ${Math.abs(originalLat - backToCoords.latitude).toFixed(10)}° lat, ${Math.abs(originalLng - backToCoords.longitude).toFixed(10)}° lng`);
console.log();

// Example 4: Validierung
console.log('4. MGRS Validierung');
const validExamples = ['33UUU9185320652', '33UUU918206', '33UUU', '5QKB1234567890'];
const invalidExamples = ['INVALID', '33UUU123', 'ABC', '', '33U1234567890'];

console.log('  Gültige MGRS Strings:');
for (const mgrs of validExamples) {
  console.log(`    ${mgrs.padEnd(20)} → ${mgrsConverter.isValidMgrs(mgrs) ? '✓' : '✗'}`);
}

console.log('\n  Ungültige MGRS Strings:');
for (const mgrs of invalidExamples) {
  console.log(`${`    "${mgrs}"`.padEnd(22)} → ${mgrsConverter.isValidMgrs(mgrs) ? '✓' : '✗'}`);
}
console.log();

// Example 5: Verschiedene Standorte weltweit
console.log('5. Weltweite Standorte → MGRS');
const locations = [
  { name: 'Berlin', lat: 52.516275, lng: 13.377704 },
  { name: 'Paris', lat: 48.8566, lng: 2.3522 },
  { name: 'London', lat: 51.5074, lng: -0.1278 },
  { name: 'New York', lat: 40.7128, lng: -74.006 },
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
  { name: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729 },
];

for (const location of locations) {
  const mgrs = mgrsConverter.latLngToMgrs(location.lat, location.lng, 5);
  console.log(`  ${location.name.padEnd(15)} → ${mgrs}`);
}
console.log();

// Example 6: Error Handling
console.log('6. Error Handling');
try {
  mgrsConverter.latLngToMgrs(91, 0); // Invalid latitude
} catch (error) {
  console.log(`  ✓ Fehler abgefangen: ${error instanceof Error ? error.message : error}`);
}

try {
  mgrsConverter.mgrsToLatLng('INVALID'); // Invalid MGRS
} catch (error) {
  console.log(`  ✓ Fehler abgefangen: ${error instanceof Error ? error.message : error}`);
}
console.log();

console.log('=== Alle Examples erfolgreich ausgeführt! ===');
