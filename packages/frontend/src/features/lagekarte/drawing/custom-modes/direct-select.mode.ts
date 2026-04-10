/**
 * Custom Direct-Select-Modus für parametrische Formen
 *
 * Für Kreise: Zeigt nur einen einzigen Resize-Griff statt aller 64 Polygon-Vertices.
 * Beim Ziehen wird der Kreis aus Mittelpunkt + neuem Radius neu berechnet.
 * Für alle anderen Features: Standard-direct_select-Verhalten.
 */

import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { berechneAbstand, berechneBearing, erstelleEllipse, erstelleKreis, erstelleSektor } from '../../utils/geo-calculations';

const defaultDirectSelect = MapboxDraw.modes.direct_select;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomDirectSelect: any = { ...defaultDirectSelect };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
CustomDirectSelect.onSetup = function (opts: any) {
  const state = defaultDirectSelect.onSetup.call(this, opts);

  const props = state.feature.properties;
  if (props.shapeType === 'circle' && props.shapeCenter) {
    state.isParametric = true;
    state.shapeType = 'circle';
    state.shapeCenter = JSON.parse(props.shapeCenter) as [number, number];
    state.shapeRadius = props.shapeRadius ?? 0;
  } else if (props.shapeType === 'sector' && props.shapeCenter) {
    state.isParametric = true;
    state.shapeType = 'sector';
    state.shapeCenter = JSON.parse(props.shapeCenter) as [number, number];
    state.shapeRadius = props.shapeRadius ?? 0;
    state.shapeBearing = props.shapeBearing ?? 0;
    state.shapeOpeningAngle = props.shapeOpeningAngle ?? 60;
  } else if (props.shapeType === 'ellipse' && props.shapeCenter) {
    state.isParametric = true;
    state.shapeType = 'ellipse';
    state.shapeCenter = JSON.parse(props.shapeCenter) as [number, number];
    state.shapeRadiusX = props.shapeRadiusX ?? 0;
    state.shapeRadiusY = props.shapeRadiusY ?? 0;
  }

  // GAMS-Zonen: Min/Max-Radius aus Nachbar-Zonen berechnen
  state.minRadius = 1;
  state.maxRadius = Infinity;

  if (state.isParametric && props.featureType === 'gams_zone') {
    const centerStr = props.shapeCenter;
    // Draw-Instanz über Map-Controls finden (für getAll)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const drawCtrl = this.map._controls?.find((c: any) => typeof c.getAll === 'function');
    const allFeatures = drawCtrl?.getAll()?.features ?? [];
    const siblingRadii: number[] = [];

    for (const f of allFeatures) {
      if (f.id !== state.featureId && f.properties?.featureType === 'gams_zone' && f.properties?.shapeCenter === centerStr && f.properties?.shapeRadius) {
        siblingRadii.push(f.properties.shapeRadius);
      }
    }

    siblingRadii.sort((a: number, b: number) => a - b);
    const currentR = state.shapeRadius;

    for (const r of siblingRadii) {
      if (r < currentR) state.minRadius = r + 1;
    }
    for (const r of siblingRadii) {
      if (r > currentR) {
        state.maxRadius = r - 1;
        break;
      }
    }
  }

  return state;
};

/**
 * Zeigt für parametrische Formen nur einen Resize-Griff,
 * für andere Features das Standard-Verhalten mit allen Vertices.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
CustomDirectSelect.toDisplayFeatures = function (state: any, geojson: any, push: any) {
  // Pfeilspitze für Arrow-Features (auch bei Nicht-Parametric)
  if (geojson.geometry?.type === 'LineString' && geojson.properties?.user_shapeType === 'arrow') {
    const coords = geojson.geometry.coordinates;
    if (coords && coords.length >= 2) {
      const from: [number, number] = coords[coords.length - 2] as [number, number];
      const to: [number, number] = coords[coords.length - 1] as [number, number];
      const bearing = berechneBearing(from, to);
      push({
        type: 'Feature',
        properties: { meta: 'arrowhead', parent: geojson.properties.id, arrowBearing: bearing, active: geojson.properties.active },
        geometry: { type: 'Point', coordinates: to },
      });
    }
  }

  if (!state.isParametric || state.featureId !== geojson.properties.id) {
    return defaultDirectSelect.toDisplayFeatures.call(this, state, geojson, push);
  }

  // Polygon mit active-Flag anzeigen
  geojson.properties.active = 'true';
  push(geojson);

  // Nur einen einzigen Resize-Griff anzeigen (statt 64+ Vertices)
  const coords = geojson.geometry.coordinates[0];
  if (coords?.length > 0) {
    // Griff am ersten Punkt des Rings (= "nördlichster" Punkt bei turf.circle)
    const handleCoord = coords[0];
    const isSelected = state.selectedCoordPaths.indexOf('0.0') !== -1;
    push({
      type: 'Feature',
      properties: {
        meta: 'vertex',
        parent: state.featureId,
        coord_path: '0.0',
        active: isSelected ? 'true' : 'false',
      },
      geometry: {
        type: 'Point',
        coordinates: handleCoord,
      },
    });
  }

  this.fireActionable(state);
};

/**
 * Für parametrische Formen: Gesamte Geometrie neu berechnen statt einzelnen Vertex zu verschieben.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
CustomDirectSelect.dragVertex = function (state: any, e: any, delta: any) {
  if (!state.isParametric) {
    return defaultDirectSelect.dragVertex.call(this, state, e, delta);
  }

  const center = state.shapeCenter as [number, number];
  const dragPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat];
  let newRadius = berechneAbstand(center, dragPoint);

  // Radius zwischen Min/Max beschränken (GAMS-Zonen)
  newRadius = Math.max(state.minRadius ?? 1, Math.min(state.maxRadius ?? Infinity, newRadius));
  if (newRadius < 1) return;

  state.shapeRadius = newRadius;

  if (state.shapeType === 'circle') {
    const coords = erstelleKreis(center, newRadius);
    // incomingCoords erwartet GeoJSON-Koordinaten (mit Closing-Point)
    state.feature.incomingCoords(coords);
  } else if (state.shapeType === 'sector') {
    const coords = erstelleSektor(center, newRadius, state.shapeBearing, state.shapeOpeningAngle);
    state.feature.incomingCoords(coords);
  } else if (state.shapeType === 'ellipse') {
    // Proportionales Scaling: beide Radien skalieren mit demselben Faktor
    const oldRadius = berechneAbstand(center, state.feature.getCoordinates()[0][0]);
    const scale = oldRadius > 0 ? newRadius / oldRadius : 1;
    state.shapeRadiusX = (state.shapeRadiusX ?? 1) * scale;
    state.shapeRadiusY = (state.shapeRadiusY ?? 1) * scale;
    const coords = erstelleEllipse(center, state.shapeRadiusX, state.shapeRadiusY);
    state.feature.incomingCoords(coords);
  }
};

/**
 * Keine Midpoints für parametrische Formen zulassen (würden die Form korrumpieren).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
CustomDirectSelect.onMidpoint = function (state: any, e: any) {
  if (state.isParametric) return;
  return defaultDirectSelect.onMidpoint.call(this, state, e);
};

/**
 * Nach dem Drag: Shape-Properties (Radius) am Feature aktualisieren.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
CustomDirectSelect.onTouchEnd = CustomDirectSelect.onMouseUp = function (state: any) {
  if (state.isParametric && state.dragMoving) {
    if (state.shapeType === 'ellipse') {
      state.feature.properties.shapeRadiusX = state.shapeRadiusX;
      state.feature.properties.shapeRadiusY = state.shapeRadiusY;
    } else {
      state.feature.properties.shapeRadius = state.shapeRadius;
    }
  }
  if (state.dragMoving) {
    this.fireUpdate();
  }
  this.stopDragging(state);
};

export { CustomDirectSelect };
