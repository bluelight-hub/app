import { GeoCoordinate } from '@domain/value-objects/geo-coordinate';

describe('GeoCoordinate', () => {
  describe('create() - Factory Method', () => {
    it('should create GeoCoordinate with valid Berlin coordinates', () => {
      // Given: Berlin coordinates
      const lat = 52.52;
      const lng = 13.4;

      // When: Creating GeoCoordinate
      const result = GeoCoordinate.create(lat, lng);

      // Then: Success with correct values
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.latitude).toBe(lat);
      expect(result.value?.longitude).toBe(lng);
      expect(result.error).toBeUndefined();
    });

    it('should create GeoCoordinate with valid Hamburg coordinates', () => {
      // Given: Hamburg coordinates
      const lat = 53.55;
      const lng = 10.0;

      // When: Creating GeoCoordinate
      const result = GeoCoordinate.create(lat, lng);

      // Then: Success with correct values
      expect(result.isSuccess).toBe(true);
      expect(result.value?.latitude).toBe(lat);
      expect(result.value?.longitude).toBe(lng);
    });

    it('should fail with latitude > 90', () => {
      // Given: Invalid latitude (too high)
      const lat = 91.0;
      const lng = 13.4;

      // When: Creating GeoCoordinate
      const result = GeoCoordinate.create(lat, lng);

      // Then: Failure with error message
      expect(result.isFailure).toBe(true);
      expect(result.isSuccess).toBe(false);
      expect(result.value).toBeUndefined();
      expect(result.error).toBe('Invalid latitude: 91. Must be between -90 and 90');
    });

    it('should fail with latitude < -90', () => {
      // Given: Invalid latitude (too low)
      const lat = -91.0;
      const lng = 13.4;

      // When: Creating GeoCoordinate
      const result = GeoCoordinate.create(lat, lng);

      // Then: Failure with error message
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Invalid latitude: -91. Must be between -90 and 90');
    });

    it('should fail with longitude > 180', () => {
      // Given: Invalid longitude (too high)
      const lat = 52.52;
      const lng = 181.0;

      // When: Creating GeoCoordinate
      const result = GeoCoordinate.create(lat, lng);

      // Then: Failure with error message
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Invalid longitude: 181. Must be between -180 and 180');
    });

    it('should fail with longitude < -180', () => {
      // Given: Invalid longitude (too low)
      const lat = 52.52;
      const lng = -181.0;

      // When: Creating GeoCoordinate
      const result = GeoCoordinate.create(lat, lng);

      // Then: Failure with error message
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Invalid longitude: -181. Must be between -180 and 180');
    });

    it('should accept edge case latitude values (-90, 0, 90)', () => {
      // Given: Edge case latitudes
      const southPole = GeoCoordinate.create(-90, 0);
      const equator = GeoCoordinate.create(0, 0);
      const northPole = GeoCoordinate.create(90, 0);

      // When: Creating GeoCoordinates
      // Then: All succeed
      expect(southPole.isSuccess).toBe(true);
      expect(equator.isSuccess).toBe(true);
      expect(northPole.isSuccess).toBe(true);
    });

    it('should accept edge case longitude values (-180, 0, 180)', () => {
      // Given: Edge case longitudes
      const dateLineWest = GeoCoordinate.create(0, -180);
      const primeMeridian = GeoCoordinate.create(0, 0);
      const dateLineEast = GeoCoordinate.create(0, 180);

      // When: Creating GeoCoordinates
      // Then: All succeed
      expect(dateLineWest.isSuccess).toBe(true);
      expect(primeMeridian.isSuccess).toBe(true);
      expect(dateLineEast.isSuccess).toBe(true);
    });
  });

  describe('distanceTo() - Haversine Distance', () => {
    it('should calculate Berlin to Hamburg distance ≈ 255km', () => {
      // Given: Berlin and Hamburg coordinates
      const berlin = GeoCoordinate.create(52.52, 13.4).value as GeoCoordinate;
      const hamburg = GeoCoordinate.create(53.55, 10.0).value as GeoCoordinate;

      // When: Calculating distance
      const distanceMeters = berlin.distanceTo(hamburg);
      const distanceKm = distanceMeters / 1000;

      // Then: Approximately 255km (±5km tolerance)
      expect(distanceKm).toBeGreaterThan(250);
      expect(distanceKm).toBeLessThan(260);
    });

    it('should calculate distance from Berlin to Munich ≈ 504km', () => {
      // Given: Berlin and Munich coordinates
      const berlin = GeoCoordinate.create(52.52, 13.4).value as GeoCoordinate;
      const munich = GeoCoordinate.create(48.14, 11.58).value as GeoCoordinate;

      // When: Calculating distance
      const distanceMeters = berlin.distanceTo(munich);
      const distanceKm = distanceMeters / 1000;

      // Then: Approximately 504km (±10km tolerance)
      expect(distanceKm).toBeGreaterThan(494);
      expect(distanceKm).toBeLessThan(514);
    });

    it('should return 0 for same coordinates', () => {
      // Given: Same coordinates
      const berlin1 = GeoCoordinate.create(52.52, 13.4).value as GeoCoordinate;
      const berlin2 = GeoCoordinate.create(52.52, 13.4).value as GeoCoordinate;

      // When: Calculating distance
      const distance = berlin1.distanceTo(berlin2);

      // Then: Distance is 0
      expect(distance).toBe(0);
    });

    it('should calculate symmetric distance (A→B = B→A)', () => {
      // Given: Two coordinates
      const berlin = GeoCoordinate.create(52.52, 13.4).value as GeoCoordinate;
      const hamburg = GeoCoordinate.create(53.55, 10.0).value as GeoCoordinate;

      // When: Calculating both directions
      const berlinToHamburg = berlin.distanceTo(hamburg);
      const hamburgToBerlin = hamburg.distanceTo(berlin);

      // Then: Distance is symmetric
      expect(berlinToHamburg).toBe(hamburgToBerlin);
    });
  });

  describe('toString() - String Representation', () => {
    it('should format Berlin coordinates correctly with N/E', () => {
      // Given: Berlin coordinates (positive lat/lng)
      const berlin = GeoCoordinate.create(52.52, 13.4).value as GeoCoordinate;

      // When: Converting to string
      const str = berlin.toString();

      // Then: Format "52.5200°N, 13.4000°E"
      expect(str).toBe('52.5200°N, 13.4000°E');
    });

    it('should format coordinates with S hemisphere correctly', () => {
      // Given: Southern hemisphere coordinates
      const capeTown = GeoCoordinate.create(-33.92, 18.42).value as GeoCoordinate;

      // When: Converting to string
      const str = capeTown.toString();

      // Then: Format "33.9200°S, 18.4200°E"
      expect(str).toBe('33.9200°S, 18.4200°E');
    });

    it('should format coordinates with W hemisphere correctly', () => {
      // Given: Western hemisphere coordinates (New York)
      const newYork = GeoCoordinate.create(40.71, -74.01).value as GeoCoordinate;

      // When: Converting to string
      const str = newYork.toString();

      // Then: Format "40.7100°N, 74.0100°W"
      expect(str).toBe('40.7100°N, 74.0100°W');
    });

    it('should format coordinates with S/W hemispheres correctly', () => {
      // Given: Southern + Western hemisphere (Buenos Aires)
      const buenosAires = GeoCoordinate.create(-34.6, -58.38).value as GeoCoordinate;

      // When: Converting to string
      const str = buenosAires.toString();

      // Then: Format "34.6000°S, 58.3800°W"
      expect(str).toBe('34.6000°S, 58.3800°W');
    });

    it('should format with 4 decimal places (≈11m precision)', () => {
      // Given: Coordinate with many decimal places
      const coord = GeoCoordinate.create(52.123456789, 13.987654321).value as GeoCoordinate;

      // When: Converting to string
      const str = coord.toString();

      // Then: Exactly 4 decimal places
      expect(str).toBe('52.1235°N, 13.9877°E');
    });
  });

  describe('equals() - Equality', () => {
    it('should return true for same coordinates', () => {
      // Given: Two GeoCoordinates with same values
      const coord1 = GeoCoordinate.create(52.52, 13.4).value as GeoCoordinate;
      const coord2 = GeoCoordinate.create(52.52, 13.4).value as GeoCoordinate;

      // When: Comparing for equality
      const areEqual = coord1.equals(coord2);

      // Then: Equals returns true
      expect(areEqual).toBe(true);
      expect(coord1).not.toBe(coord2); // Different instances
    });

    it('should return false for different coordinates', () => {
      // Given: Two different coordinates
      const berlin = GeoCoordinate.create(52.52, 13.4).value as GeoCoordinate;
      const hamburg = GeoCoordinate.create(53.55, 10.0).value as GeoCoordinate;

      // When: Comparing for equality
      const areEqual = berlin.equals(hamburg);

      // Then: Equals returns false
      expect(areEqual).toBe(false);
    });
  });

  describe('ValueObject Integration', () => {
    it('should inherit from ValueObject with immutable props', () => {
      // Given: GeoCoordinate instance
      const coord = GeoCoordinate.create(52.52, 13.4).value as GeoCoordinate;

      // When: Accessing props
      const props = coord.props;

      // Then: Props are readonly and frozen
      expect(Object.isFrozen(props)).toBe(true);
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        props.latitude = 0;
      }).toThrow();
    });
  });

  describe('toGeoJsonCoordinates() - GeoJSON Format', () => {
    it('should return GeoJSON coordinates in [lng, lat] format', () => {
      // TC-P0-019: toGeoJsonCoordinates basic conversion
      // Given: Berlin Koordinaten
      const coord = GeoCoordinate.create(52.525, 13.369).value as GeoCoordinate;

      // When: Konvertierung zu GeoJSON
      const result = coord.toGeoJsonCoordinates();

      // Then: Format [longitude, latitude] (Longitude zuerst!)
      expect(result).toEqual([13.369, 52.525]);
      expect(result[0]).toBe(13.369); // Longitude
      expect(result[1]).toBe(52.525); // Latitude
    });

    it('should convert negative coordinates correctly', () => {
      // TC-P0-019: toGeoJsonCoordinates negative coordinates
      // Given: Südliche und westliche Hemisphäre (Buenos Aires)
      const coord = GeoCoordinate.create(-34.6, -58.38).value as GeoCoordinate;

      // When: Konvertierung zu GeoJSON
      const result = coord.toGeoJsonCoordinates();

      // Then: Negative Werte bleiben erhalten
      expect(result).toEqual([-58.38, -34.6]);
    });
  });

  describe('toLatLngArray() - Lat/Lng Format', () => {
    it('should return coordinates in [lat, lng] format', () => {
      // TC-P0-019: toLatLngArray basic conversion
      // Given: Berlin Koordinaten
      const coord = GeoCoordinate.create(52.525, 13.369).value as GeoCoordinate;

      // When: Konvertierung zu Lat/Lng Array
      const result = coord.toLatLngArray();

      // Then: Format [latitude, longitude] (Latitude zuerst!)
      expect(result).toEqual([52.525, 13.369]);
      expect(result[0]).toBe(52.525); // Latitude
      expect(result[1]).toBe(13.369); // Longitude
    });

    it('should convert negative coordinates correctly', () => {
      // TC-P0-019: toLatLngArray negative coordinates
      // Given: Südliche und westliche Hemisphäre (Buenos Aires)
      const coord = GeoCoordinate.create(-34.6, -58.38).value as GeoCoordinate;

      // When: Konvertierung zu Lat/Lng Array
      const result = coord.toLatLngArray();

      // Then: Negative Werte bleiben erhalten
      expect(result).toEqual([-34.6, -58.38]);
    });
  });

  describe('fromGeoJson() - GeoJSON Parsing', () => {
    it('should parse valid GeoJSON coordinates [lng, lat]', () => {
      // TC-P0-019: fromGeoJson valid parsing
      // Given: GeoJSON Koordinaten für Berlin [lng, lat]
      const geoJsonCoords: [number, number] = [13.369, 52.525];

      // When: Parsing GeoJSON
      const result = GeoCoordinate.fromGeoJson(geoJsonCoords);

      // Then: Success mit korrekter Lat/Lng Zuordnung
      expect(result.isSuccess).toBe(true);
      expect(result.value?.latitude).toBe(52.525);
      expect(result.value?.longitude).toBe(13.369);
    });

    it('should reject invalid longitude (> 180)', () => {
      // TC-P0-019: fromGeoJson invalid longitude high
      // Given: Ungültige Longitude
      const invalidCoords: [number, number] = [181, 52];

      // When: Parsing ungültiger GeoJSON
      const result = GeoCoordinate.fromGeoJson(invalidCoords);

      // Then: Failure mit Validierungsfehler
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Invalid longitude: 181. Must be between -180 and 180');
    });

    it('should reject invalid latitude (> 90)', () => {
      // TC-P0-019: fromGeoJson invalid latitude high
      // Given: Ungültige Latitude
      const invalidCoords: [number, number] = [13.369, 91];

      // When: Parsing ungültiger GeoJSON
      const result = GeoCoordinate.fromGeoJson(invalidCoords);

      // Then: Failure mit Validierungsfehler
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Invalid latitude: 91. Must be between -90 and 90');
    });

    it('should reject invalid longitude (< -180)', () => {
      // TC-P0-019: fromGeoJson invalid longitude low
      // Given: Ungültige Longitude (westlich der Datumsgrenze)
      const invalidCoords: [number, number] = [-181, 52];

      // When: Parsing ungültiger GeoJSON
      const result = GeoCoordinate.fromGeoJson(invalidCoords);

      // Then: Failure mit Validierungsfehler
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Invalid longitude: -181. Must be between -180 and 180');
    });

    it('should accept exact boundary longitude -180', () => {
      // TC-P0-019: fromGeoJson boundary longitude -180
      // Given: GeoJSON with minimum longitude
      const coords: [number, number] = [-180, 0];

      // When: Parsing GeoJSON
      const result = GeoCoordinate.fromGeoJson(coords);

      // Then: Success
      expect(result.isSuccess).toBe(true);
      expect(result.value?.longitude).toBe(-180);
    });

    it('should accept exact boundary longitude 180', () => {
      // TC-P0-019: fromGeoJson boundary longitude 180
      // Given: GeoJSON with maximum longitude
      const coords: [number, number] = [180, 0];

      // When: Parsing GeoJSON
      const result = GeoCoordinate.fromGeoJson(coords);

      // Then: Success
      expect(result.isSuccess).toBe(true);
      expect(result.value?.longitude).toBe(180);
    });

    it('should accept exact boundary latitude -90', () => {
      // TC-P0-019: fromGeoJson boundary latitude -90
      // Given: GeoJSON with minimum latitude (South Pole)
      const coords: [number, number] = [0, -90];

      // When: Parsing GeoJSON
      const result = GeoCoordinate.fromGeoJson(coords);

      // Then: Success
      expect(result.isSuccess).toBe(true);
      expect(result.value?.latitude).toBe(-90);
    });

    it('should accept exact boundary latitude 90', () => {
      // TC-P0-019: fromGeoJson boundary latitude 90
      // Given: GeoJSON with maximum latitude (North Pole)
      const coords: [number, number] = [0, 90];

      // When: Parsing GeoJSON
      const result = GeoCoordinate.fromGeoJson(coords);

      // Then: Success
      expect(result.isSuccess).toBe(true);
      expect(result.value?.latitude).toBe(90);
    });
  });

  describe('Roundtrip Tests - Bidirektionale Konvertierung', () => {
    it('should satisfy create → toGeoJsonCoordinates → fromGeoJson → equals(original)', () => {
      // TC-P0-019: GeoJSON roundtrip
      // Given: Original GeoCoordinate (Berlin)
      const original = GeoCoordinate.create(52.525, 13.369).value as GeoCoordinate;

      // When: Roundtrip über GeoJSON
      const geoJson = original.toGeoJsonCoordinates();
      const roundtrip = GeoCoordinate.fromGeoJson(geoJson).value as GeoCoordinate;

      // Then: Roundtrip entspricht Original
      expect(roundtrip.equals(original)).toBe(true);
      expect(roundtrip.latitude).toBe(original.latitude);
      expect(roundtrip.longitude).toBe(original.longitude);
    });

    it('should satisfy create → toLatLngArray → create → equals(original)', () => {
      // TC-P0-019: LatLng roundtrip
      // Given: Original GeoCoordinate (Hamburg)
      const original = GeoCoordinate.create(53.55, 10.0).value as GeoCoordinate;

      // When: Roundtrip über Lat/Lng Array
      const [lat, lng] = original.toLatLngArray();
      const roundtrip = GeoCoordinate.create(lat, lng).value as GeoCoordinate;

      // Then: Roundtrip entspricht Original
      expect(roundtrip.equals(original)).toBe(true);
      expect(roundtrip.latitude).toBe(original.latitude);
      expect(roundtrip.longitude).toBe(original.longitude);
    });

    it('should roundtrip negative coordinates correctly', () => {
      // TC-P0-019: Negative coordinates roundtrip
      // Given: Südliche und westliche Hemisphäre (Buenos Aires)
      const original = GeoCoordinate.create(-34.6, -58.38).value as GeoCoordinate;

      // When: Roundtrip über GeoJSON
      const geoJson = original.toGeoJsonCoordinates();
      const roundtrip = GeoCoordinate.fromGeoJson(geoJson).value as GeoCoordinate;

      // Then: Roundtrip entspricht Original
      expect(roundtrip.equals(original)).toBe(true);
    });
  });

  describe('Edge Cases - Spezialfälle', () => {
    it('should convert Null Island (0, 0) correctly', () => {
      // Given: Null Island (Äquator und Prime Meridian)
      const nullIsland = GeoCoordinate.create(0, 0).value as GeoCoordinate;

      // When: Konvertierung zu GeoJSON
      const geoJson = nullIsland.toGeoJsonCoordinates();

      // Then: [0, 0]
      expect(geoJson).toEqual([0, 0]);
    });

    it('should convert North Pole (90, 0) correctly', () => {
      // Given: Nordpol (maximale Latitude)
      const northPole = GeoCoordinate.create(90, 0).value as GeoCoordinate;

      // When: Konvertierung zu GeoJSON
      const geoJson = northPole.toGeoJsonCoordinates();

      // Then: [0, 90]
      expect(geoJson).toEqual([0, 90]);
    });

    it('should convert South Pole (-90, 0) correctly', () => {
      // Given: Südpol (minimale Latitude)
      const southPole = GeoCoordinate.create(-90, 0).value as GeoCoordinate;

      // When: Konvertierung zu GeoJSON
      const geoJson = southPole.toGeoJsonCoordinates();

      // Then: [0, -90]
      expect(geoJson).toEqual([0, -90]);
    });

    it('should convert Date Line West (-180, 0) correctly', () => {
      // Given: Datumsgrenze (westliche Grenze)
      const dateLine = GeoCoordinate.create(0, -180).value as GeoCoordinate;

      // When: Konvertierung zu GeoJSON
      const geoJson = dateLine.toGeoJsonCoordinates();

      // Then: [-180, 0]
      expect(geoJson).toEqual([-180, 0]);
    });

    it('should convert Date Line East (180, 0) correctly', () => {
      // Given: Datumsgrenze (östliche Grenze)
      const dateLine = GeoCoordinate.create(0, 180).value as GeoCoordinate;

      // When: Konvertierung zu GeoJSON
      const geoJson = dateLine.toGeoJsonCoordinates();

      // Then: [180, 0]
      expect(geoJson).toEqual([180, 0]);
    });

    it('should succeed with fromGeoJson for Null Island', () => {
      // Given: GeoJSON für Null Island
      const geoJson: [number, number] = [0, 0];

      // When: Parsing
      const result = GeoCoordinate.fromGeoJson(geoJson);

      // Then: Success
      expect(result.isSuccess).toBe(true);
      expect(result.value?.latitude).toBe(0);
      expect(result.value?.longitude).toBe(0);
    });
  });
});
