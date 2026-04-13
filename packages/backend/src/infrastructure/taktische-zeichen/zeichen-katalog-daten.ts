/**
 * Standard-Katalogeinträge nach DV 102 für den Zeichen-Katalog.
 *
 * Single Source of Truth — wird vom Startup-Seeder und vom prisma:seed genutzt.
 * Sortierung erfolgt NICHT über sortOrder, sondern dynamisch im Repository
 * nach Kategorie → Organisation → Name.
 */

interface KatalogEintragDefinition {
  name: string;
  kategorie: string;
  zeichenDefinition: Record<string, string>;
  tags: string[];
}

// prettier-ignore
export const ZEICHEN_KATALOG_STANDARD_EINTRAEGE: readonly KatalogEintragDefinition[] = [
  // ===== FUEHRUNG =====
  { name: 'Einsatzleitung', kategorie: 'FUEHRUNG', zeichenDefinition: { grundzeichen: 'befehlsstelle', fachaufgabe: 'fuehrung' }, tags: ['el', 'einsatzleitung', 'führung'] },
  { name: 'Einsatzabschnittsleitung', kategorie: 'FUEHRUNG', zeichenDefinition: { grundzeichen: 'befehlsstelle', fachaufgabe: 'fuehrung', einheit: 'zug' }, tags: ['eal', 'abschnitt', 'abschnittsleitung'] },
  { name: 'Führungsstelle', kategorie: 'FUEHRUNG', zeichenDefinition: { grundzeichen: 'befehlsstelle', organisation: 'fuehrung', fachaufgabe: 'fuehrung' }, tags: ['führungsstelle', 'stab'] },
  { name: 'Technische Einsatzleitung', kategorie: 'FUEHRUNG', zeichenDefinition: { grundzeichen: 'befehlsstelle', organisation: 'fuehrung', fachaufgabe: 'fuehrung', verwaltungsstufe: 'kreis' }, tags: ['tel', 'technische einsatzleitung', 'kreis'] },
  { name: 'Organisatorischer Leiter', kategorie: 'FUEHRUNG', zeichenDefinition: { grundzeichen: 'person', organisation: 'hilfsorganisation', fachaufgabe: 'fuehrung' }, tags: ['orgl', 'organisatorischer leiter', 'rettungsdienst'] },
  { name: 'Leitender Notarzt', kategorie: 'FUEHRUNG', zeichenDefinition: { grundzeichen: 'person', organisation: 'hilfsorganisation', fachaufgabe: 'aerztliche-versorgung' }, tags: ['lna', 'leitender notarzt', 'arzt'] },
  { name: 'Fachberater', kategorie: 'FUEHRUNG', zeichenDefinition: { grundzeichen: 'person' }, tags: ['fachberater', 'berater'] },
  { name: 'Einsatzleitung Hilfsorganisation', kategorie: 'FUEHRUNG', zeichenDefinition: { grundzeichen: 'befehlsstelle', organisation: 'hilfsorganisation', fachaufgabe: 'fuehrung' }, tags: ['el', 'hilfsorganisation', 'drk', 'asb', 'juh', 'mhd', 'dlrg'] },
  { name: 'Einsatzabschnittsleitung Hilfsorganisation', kategorie: 'FUEHRUNG', zeichenDefinition: { grundzeichen: 'befehlsstelle', organisation: 'hilfsorganisation', fachaufgabe: 'fuehrung', einheit: 'zug' }, tags: ['eal', 'abschnitt', 'hilfsorganisation'] },
  { name: 'Einsatzleitung THW', kategorie: 'FUEHRUNG', zeichenDefinition: { grundzeichen: 'befehlsstelle', organisation: 'thw', fachaufgabe: 'fuehrung' }, tags: ['el', 'thw', 'führung'] },
  { name: 'Einsatzabschnittsleitung THW', kategorie: 'FUEHRUNG', zeichenDefinition: { grundzeichen: 'befehlsstelle', organisation: 'thw', fachaufgabe: 'fuehrung', einheit: 'zug' }, tags: ['eal', 'abschnitt', 'thw'] },
  { name: 'Einsatzleitung Feuerwehr', kategorie: 'FUEHRUNG', zeichenDefinition: { grundzeichen: 'befehlsstelle', organisation: 'feuerwehr', fachaufgabe: 'fuehrung' }, tags: ['el', 'feuerwehr', 'führung'] },
  { name: 'Einsatzabschnittsleitung Feuerwehr', kategorie: 'FUEHRUNG', zeichenDefinition: { grundzeichen: 'befehlsstelle', organisation: 'feuerwehr', fachaufgabe: 'fuehrung', einheit: 'zug' }, tags: ['eal', 'abschnitt', 'feuerwehr'] },

  // ===== EINHEITEN — Hilfsorganisationen =====
  { name: 'SEG Rettung', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'rettungswesen', einheit: 'gruppe' }, tags: ['seg', 'rettung', 'schnelleinsatzgruppe'] },
  { name: 'SEG Betreuung', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'betreuung', einheit: 'gruppe' }, tags: ['seg', 'betreuung', 'schnelleinsatzgruppe'] },
  { name: 'SEG Verpflegung', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'verpflegung', einheit: 'gruppe' }, tags: ['seg', 'verpflegung', 'schnelleinsatzgruppe'] },
  { name: 'SEG Technik', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'technische-hilfeleistung', einheit: 'gruppe' }, tags: ['seg', 'technik', 'schnelleinsatzgruppe'] },
  { name: 'SEG Transport', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'transport', einheit: 'gruppe' }, tags: ['seg', 'transport', 'schnelleinsatzgruppe'] },
  { name: 'SEG IuK', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'iuk', einheit: 'gruppe' }, tags: ['seg', 'iuk', 'kommunikation', 'funk', 'schnelleinsatzgruppe'] },
  { name: 'Sanitätsgruppe', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'rettungswesen', einheit: 'gruppe' }, tags: ['sanität', 'sanitätsgruppe', 'san'] },
  { name: 'Sanitätszug', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'rettungswesen', einheit: 'zug' }, tags: ['sanität', 'sanitätszug', 'san', 'zug'] },
  { name: 'Betreuungszug', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'betreuung', einheit: 'zug' }, tags: ['betreuung', 'betreuungszug', 'zug'] },
  { name: 'Einsatzeinheit', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'einsatzeinheit', einheit: 'zug' }, tags: ['einsatzeinheit', 'ee'] },
  { name: 'Rettungshundestaffel', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'rettungshunde', einheit: 'staffel' }, tags: ['rettungshunde', 'hundestaffel', 'rhs', 'suche'] },
  { name: 'Wasserrettungszug', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'wasserrettung', einheit: 'zug' }, tags: ['wasserrettung', 'dlrg', 'wasserwacht', 'zug'] },
  { name: 'Wasserrettungsgruppe', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'wasserrettung', einheit: 'gruppe' }, tags: ['wasserrettung', 'dlrg', 'wasserwacht', 'gruppe'] },
  { name: 'Suchdienst DRK', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'erkundung', einheit: 'gruppe' }, tags: ['suchdienst', 'drk', 'suche', 'vermisste'] },
  { name: 'Wohlfahrtspflege DRK', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'betreuung', einheit: 'staffel' }, tags: ['wohlfahrt', 'wohlfahrtspflege', 'drk', 'sozialarbeit'] },
  { name: 'Jugendrotkreuz-Trupp', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'betreuung', einheit: 'trupp' }, tags: ['jrk', 'jugendrotkreuz', 'drk', 'jugend'] },
  { name: 'Bergwacht-Gruppe', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'hoehenrettung', einheit: 'gruppe' }, tags: ['bergwacht', 'bergrettung', 'drk', 'höhenrettung'] },
  { name: 'Sanitätstrupp', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'rettungswesen', einheit: 'trupp' }, tags: ['sanität', 'trupp', 'san'] },
  { name: 'Betreuungstrupp', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'betreuung', einheit: 'trupp' }, tags: ['betreuung', 'trupp'] },
  { name: 'Verpflegungstrupp', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'verpflegung', einheit: 'trupp' }, tags: ['verpflegung', 'trupp', 'kochen'] },
  { name: 'Seelsorge-Trupp', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'seelsorge', einheit: 'trupp' }, tags: ['seelsorge', 'psnv', 'krisenintervention', 'notfallseelsorge'] },
  { name: 'IuK-Trupp', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'iuk', einheit: 'trupp' }, tags: ['iuk', 'funk', 'kommunikation', 'fernmelder'] },
  { name: 'Erkundungstrupp', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'erkundung', einheit: 'trupp' }, tags: ['erkundung', 'erkunder', 'aufklärung'] },
  { name: 'Aufklärungstrupp Luft Hilfsorganisation', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'erkundung', einheit: 'trupp' }, tags: ['drohne', 'uav', 'aufklärung', 'luft', 'hilfsorganisation'] },
  { name: 'Veterinärgruppe', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'veterinaerwesen', einheit: 'gruppe' }, tags: ['veterinär', 'tier', 'tierschutz'] },
  { name: 'Bereitschaft', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'rettungswesen', einheit: 'bereitschaft' }, tags: ['bereitschaft', 'verband'] },

  // ===== EINHEITEN — THW =====
  { name: 'Technischer Zug THW', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'thw', fachaufgabe: 'technische-hilfeleistung', einheit: 'zug' }, tags: ['tz', 'technischer zug', 'thw'] },
  { name: 'Bergungsgruppe THW', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'thw', fachaufgabe: 'bergung', einheit: 'gruppe' }, tags: ['b', 'bergung', 'thw', 'fachgruppe'] },
  { name: 'Räumgruppe THW', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'thw', fachaufgabe: 'raeumen', einheit: 'gruppe' }, tags: ['räumung', 'räumen', 'thw', 'fachgruppe'] },
  { name: 'Infrastrukturgruppe THW', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'thw', fachaufgabe: 'versorgung-elektrizitaet', einheit: 'gruppe' }, tags: ['infrastruktur', 'elektrizität', 'thw', 'fachgruppe'] },
  { name: 'Logistikgruppe THW', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'thw', fachaufgabe: 'logistik', einheit: 'gruppe' }, tags: ['logistik', 'versorgung', 'thw', 'fachgruppe'] },
  { name: 'Ortungstrupp THW', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'thw', fachaufgabe: 'erkundung', einheit: 'trupp' }, tags: ['ortung', 'erkundung', 'thw'] },
  { name: 'Wasserschadengruppe THW', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'thw', fachaufgabe: 'pumpen', einheit: 'gruppe' }, tags: ['wasserschaden', 'pumpen', 'thw', 'fachgruppe'] },
  { name: 'Beleuchtungsgruppe THW', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'thw', fachaufgabe: 'beleuchtung', einheit: 'gruppe' }, tags: ['beleuchtung', 'licht', 'thw', 'fachgruppe'] },
  { name: 'Aufklärungstrupp Luft THW', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'thw', fachaufgabe: 'erkundung', einheit: 'trupp' }, tags: ['drohne', 'uav', 'aufklärung', 'luft', 'thw'] },

  // ===== EINHEITEN — Feuerwehr =====
  { name: 'Löschzug Feuerwehr', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'feuerwehr', fachaufgabe: 'brandbekaempfung', einheit: 'zug' }, tags: ['lz', 'löschzug', 'feuerwehr'] },
  { name: 'Löschgruppe Feuerwehr', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'feuerwehr', fachaufgabe: 'brandbekaempfung', einheit: 'gruppe' }, tags: ['lg', 'löschgruppe', 'feuerwehr'] },
  { name: 'Löschstaffel Feuerwehr', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'feuerwehr', fachaufgabe: 'brandbekaempfung', einheit: 'staffel' }, tags: ['löschstaffel', 'feuerwehr'] },
  { name: 'Rüstzug Feuerwehr', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'feuerwehr', fachaufgabe: 'technische-hilfeleistung', einheit: 'zug' }, tags: ['rüstzug', 'technische hilfe', 'feuerwehr'] },
  { name: 'ABC-Zug Feuerwehr', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'feuerwehr', fachaufgabe: 'abc', einheit: 'zug' }, tags: ['abc', 'gefahrgut', 'feuerwehr', 'cbrn'] },
  { name: 'Höhenrettungsgruppe Feuerwehr', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'feuerwehr', fachaufgabe: 'hoehenrettung', einheit: 'gruppe' }, tags: ['höhenrettung', 'feuerwehr'] },
  { name: 'Dekontaminationsgruppe', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'feuerwehr', fachaufgabe: 'dekontamination', einheit: 'gruppe' }, tags: ['dekon', 'dekontamination', 'abc', 'feuerwehr'] },
  { name: 'Messgruppe ABC', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'feuerwehr', fachaufgabe: 'messen', einheit: 'gruppe' }, tags: ['messen', 'spüren', 'abc', 'feuerwehr'] },
  { name: 'Aufklärungstrupp Luft Feuerwehr', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'feuerwehr', fachaufgabe: 'erkundung', einheit: 'trupp' }, tags: ['drohne', 'uav', 'aufklärung', 'luft', 'feuerwehr'] },

  // ===== FAHRZEUGE — Hilfsorganisationen =====
  { name: 'RTW', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'hilfsorganisation', fachaufgabe: 'rettungswesen' }, tags: ['rtw', 'rettungswagen', 'rettung'] },
  { name: 'KTW', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'hilfsorganisation', fachaufgabe: 'transport' }, tags: ['ktw', 'krankentransport', 'transport'] },
  { name: 'NEF', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'hilfsorganisation', fachaufgabe: 'aerztliche-versorgung' }, tags: ['nef', 'notarzt', 'notarzteinsatzfahrzeug'] },
  { name: 'NAW', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'hilfsorganisation', fachaufgabe: 'aerztliche-versorgung', einheit: 'trupp' }, tags: ['naw', 'notarztwagen', 'notarzt'] },
  { name: 'MTW', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'hilfsorganisation', fachaufgabe: 'transport', einheit: 'trupp' }, tags: ['mtw', 'mannschaftstransport'] },
  { name: 'GW-San', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'hilfsorganisation', fachaufgabe: 'rettungswesen', einheit: 'gruppe' }, tags: ['gw-san', 'gerätewagen', 'sanität'] },
  { name: 'GW-Betreuung', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'hilfsorganisation', fachaufgabe: 'betreuung' }, tags: ['gw-bt', 'gerätewagen', 'betreuung'] },
  { name: 'GW-IuK', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'hilfsorganisation', fachaufgabe: 'iuk' }, tags: ['gw-iuk', 'funk', 'kommunikation', 'iuk'] },
  { name: 'ELW 1 Hilfsorganisation', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'hilfsorganisation', fachaufgabe: 'fuehrung' }, tags: ['elw', 'elw1', 'einsatzleitwagen', 'hilfsorganisation'] },
  { name: 'Betreuungs-LKW', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-landgebunden', organisation: 'hilfsorganisation', fachaufgabe: 'betreuung' }, tags: ['betreuung', 'lkw'] },
  { name: 'Feldküche (Anhänger)', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'anhaenger', organisation: 'hilfsorganisation', fachaufgabe: 'verpflegung' }, tags: ['feldküche', 'verpflegung', 'anhänger', 'kochen'] },
  { name: 'Schnelleinsatzzelt (Anhänger)', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'anhaenger', organisation: 'hilfsorganisation', fachaufgabe: 'unterbringung' }, tags: ['sbz', 'schnelleinsatzzelt', 'zelt', 'anhänger', 'betreuung'] },
  { name: 'Abrollbehälter Betreuung', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'abrollbehaelter', organisation: 'hilfsorganisation', fachaufgabe: 'betreuung' }, tags: ['ab', 'abrollbehälter', 'betreuung'] },
  { name: 'Rettungsboot', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'wasserfahrzeug', organisation: 'hilfsorganisation', fachaufgabe: 'wasserrettung' }, tags: ['boot', 'rettungsboot', 'wasser', 'dlrg', 'wasserwacht'] },
  { name: 'RTH', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'hubschrauber', organisation: 'hilfsorganisation' }, tags: ['rth', 'rettungshubschrauber', 'hubschrauber', 'christoph'] },

  // ===== FAHRZEUGE — THW =====
  { name: 'GKW THW', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'thw', fachaufgabe: 'bergung' }, tags: ['gkw', 'gerätekraftwagen', 'thw'] },
  { name: 'MzKW THW', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'thw', fachaufgabe: 'technische-hilfeleistung' }, tags: ['mzkw', 'mehrzweck', 'thw'] },
  { name: 'MLW THW', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'thw', fachaufgabe: 'logistik' }, tags: ['mlw', 'materialwagen', 'logistik', 'thw'] },
  { name: 'LKW Kipper THW', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-landgebunden', organisation: 'thw', fachaufgabe: 'raeumen' }, tags: ['lkw', 'kipper', 'räumen', 'thw'] },
  { name: 'Radlader THW', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'thw', fachaufgabe: 'heben' }, tags: ['radlader', 'bagger', 'heben', 'thw'] },
  { name: 'Netzersatzanlage (Anhänger)', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'anhaenger', organisation: 'thw', fachaufgabe: 'versorgung-elektrizitaet' }, tags: ['nea', 'netzersatzanlage', 'strom', 'anhänger', 'thw'] },
  { name: 'Lichtmast (Anhänger)', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'anhaenger', organisation: 'thw', fachaufgabe: 'beleuchtung' }, tags: ['lichtmast', 'beleuchtung', 'anhänger', 'thw'] },

  // ===== FAHRZEUGE — Feuerwehr =====
  { name: 'ELW 1 Feuerwehr', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'feuerwehr', fachaufgabe: 'fuehrung' }, tags: ['elw', 'elw1', 'einsatzleitwagen', 'feuerwehr'] },
  { name: 'ELW 2 Feuerwehr', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'feuerwehr', fachaufgabe: 'fuehrung', einheit: 'zug' }, tags: ['elw2', 'einsatzleitwagen', 'feuerwehr'] },
  { name: 'LF 20', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'feuerwehr', fachaufgabe: 'brandbekaempfung' }, tags: ['lf', 'lf20', 'löschfahrzeug', 'feuerwehr'] },
  { name: 'LF 10', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-landgebunden', organisation: 'feuerwehr', fachaufgabe: 'brandbekaempfung' }, tags: ['lf', 'lf10', 'löschfahrzeug', 'feuerwehr'] },
  { name: 'TLF 4000', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'feuerwehr', fachaufgabe: 'wasserversorgung' }, tags: ['tlf', 'tanklöschfahrzeug', 'feuerwehr', 'wasser'] },
  { name: 'DLK 23/12', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-landgebunden', organisation: 'feuerwehr', fachaufgabe: 'hoehenrettung' }, tags: ['dlk', 'drehleiter', 'feuerwehr', 'höhenrettung'] },
  { name: 'RW Feuerwehr', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'feuerwehr', fachaufgabe: 'technische-hilfeleistung' }, tags: ['rw', 'rüstwagen', 'feuerwehr', 'technische hilfe'] },
  { name: 'GW-Dekon', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'feuerwehr', fachaufgabe: 'dekontamination' }, tags: ['gw-dekon', 'dekontamination', 'feuerwehr', 'abc'] },
  { name: 'GW-Mess', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'feuerwehr', fachaufgabe: 'messen' }, tags: ['gw-mess', 'messen', 'feuerwehr', 'abc'] },
  { name: 'Abrollbehälter Atemschutz', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'abrollbehaelter', organisation: 'feuerwehr', fachaufgabe: 'abc' }, tags: ['ab', 'abrollbehälter', 'atemschutz', 'feuerwehr'] },

  // ===== FAHRZEUGE — Sonstige =====
  { name: 'Polizei-Hubschrauber', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'hubschrauber', organisation: 'polizei' }, tags: ['polizei', 'hubschrauber'] },

  // ===== GEFAHREN =====
  { name: 'Brandstelle', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-akut', fachaufgabe: 'brandbekaempfung' }, tags: ['brand', 'feuer', 'gefahr'] },
  { name: 'Brandstelle (vermutet)', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-vermutet', fachaufgabe: 'brandbekaempfung' }, tags: ['brand', 'feuer', 'vermutet'] },
  { name: 'Gefahrstoff', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-akut', fachaufgabe: 'abc' }, tags: ['gefahrstoff', 'abc', 'cbrn', 'chemisch'] },
  { name: 'Gefahrstoff (vermutet)', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-vermutet', fachaufgabe: 'abc' }, tags: ['gefahrstoff', 'abc', 'cbrn', 'vermutet'] },
  { name: 'Einsturzgefahr', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-vermutet', fachaufgabe: 'bergung' }, tags: ['einsturz', 'gebäude', 'vermutet'] },
  { name: 'Einsturz (akut)', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-akut', fachaufgabe: 'bergung' }, tags: ['einsturz', 'gebäude', 'akut'] },
  { name: 'Überflutung', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-akut', fachaufgabe: 'abwehr-wassergefahren' }, tags: ['wasser', 'überflutung', 'hochwasser'] },
  { name: 'Überflutung (vermutet)', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-vermutet', fachaufgabe: 'abwehr-wassergefahren' }, tags: ['wasser', 'überflutung', 'hochwasser', 'vermutet'] },
  { name: 'Atemgifte', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-akut', fachaufgabe: 'abc' }, tags: ['atemgifte', 'atemschutz', 'gas', 'giftig'] },
  { name: 'Explosion', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-akut', fachaufgabe: 'sprengen' }, tags: ['explosion', 'sprengung', 'detonation'] },
  { name: 'Explosionsgefahr (vermutet)', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-vermutet', fachaufgabe: 'sprengen' }, tags: ['explosion', 'sprengung', 'vermutet'] },
  { name: 'Elektrizitätsgefahr', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-akut', fachaufgabe: 'versorgung-elektrizitaet' }, tags: ['elektrizität', 'strom', 'spannung', 'stromschlag'] },
  { name: 'Absturzgefahr', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-vermutet', fachaufgabe: 'hoehenrettung' }, tags: ['absturz', 'höhe', 'tiefe'] },
  { name: 'Ertrinkungsgefahr', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-akut', fachaufgabe: 'wasserrettung' }, tags: ['ertrinken', 'wasser', 'wasserrettung'] },
  { name: 'Atomare Strahlung', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-akut', fachaufgabe: 'messen' }, tags: ['atomar', 'strahlung', 'radioaktiv', 'nuklear'] },
  { name: 'Erkrankung / Verletzung', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-akut', fachaufgabe: 'rettungswesen' }, tags: ['erkrankung', 'verletzung', 'manv', 'sanität'] },
  { name: 'Angstreaktion', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-vermutet', fachaufgabe: 'betreuung' }, tags: ['angst', 'panik', 'psychisch', 'psnv'] },
  { name: 'Ausbreitung', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-akut', fachaufgabe: 'erkundung' }, tags: ['ausbreitung', 'kontamination', 'großflächig'] },
  { name: 'Durchbruch', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-akut', fachaufgabe: 'pumpen' }, tags: ['durchbruch', 'deich', 'damm', 'bruch'] },
  { name: 'Dekontamination erforderlich', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-akut', fachaufgabe: 'dekontamination' }, tags: ['dekontamination', 'dekon', 'kontamination'] },
  { name: 'Allgemeine Gefahr', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr' }, tags: ['gefahr', 'allgemein', 'warnung'] },
  { name: 'Vermutete Gefahr', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-vermutet' }, tags: ['gefahr', 'vermutet', 'verdacht'] },

  // ===== VERSORGUNG =====
  { name: 'Behandlungsplatz (BHP)', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'stelle', organisation: 'hilfsorganisation', fachaufgabe: 'aerztliche-versorgung' }, tags: ['bhp', 'behandlungsplatz', 'sanität', 'manv'] },
  { name: 'Behandlungsplatz (ortsfest)', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'ortsfeste-stelle', organisation: 'hilfsorganisation', fachaufgabe: 'aerztliche-versorgung' }, tags: ['bhp', 'behandlungsplatz', 'ortsfest'] },
  { name: 'Verletztensammelstelle', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'stelle', organisation: 'hilfsorganisation', fachaufgabe: 'rettungswesen' }, tags: ['verletztensammelstelle', 'vss', 'verletzte', 'sammeln'] },
  { name: 'Betreuungsplatz', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'stelle', organisation: 'hilfsorganisation', fachaufgabe: 'betreuung' }, tags: ['betreuungsplatz', 'betreuung', 'betroffene'] },
  { name: 'Betreuungsplatz (ortsfest)', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'ortsfeste-stelle', organisation: 'hilfsorganisation', fachaufgabe: 'betreuung' }, tags: ['betreuungsplatz', 'betreuung', 'ortsfest'] },
  { name: 'Verpflegungsstelle', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'verpflegung' }, tags: ['verpflegung', 'essen', 'versorgung'] },
  { name: 'Verpflegungsstelle (ortsfest)', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'ortsfeste-stelle', fachaufgabe: 'verpflegung' }, tags: ['verpflegung', 'essen', 'ortsfest'] },
  { name: 'Bereitstellungsraum', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'logistik' }, tags: ['br', 'bereitstellungsraum', 'bereitstellung'] },
  { name: 'Sammelstelle Betroffene', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'betreuung' }, tags: ['sammelstelle', 'sammelpunkt', 'betroffene'] },
  { name: 'Hubschrauberlandeplatz', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'transport' }, tags: ['hubschrauber', 'landeplatz', 'rth'] },
  { name: 'Dekontaminationsplatz Personen', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'dekontamination-personen' }, tags: ['dekon', 'dekontamination', 'personen'] },
  { name: 'Dekontaminationsplatz Geräte', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'dekontamination-geraete' }, tags: ['dekon', 'dekontamination', 'geräte'] },
  { name: 'Unterbringung / Notunterkunft', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'stelle', organisation: 'hilfsorganisation', fachaufgabe: 'unterbringung' }, tags: ['unterbringung', 'notunterkunft', 'unterkunft', 'bett'] },
  { name: 'Unterbringung (ortsfest)', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'ortsfeste-stelle', organisation: 'hilfsorganisation', fachaufgabe: 'unterbringung' }, tags: ['unterbringung', 'notunterkunft', 'ortsfest'] },
  { name: 'Seelsorgestelle', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'seelsorge' }, tags: ['seelsorge', 'psnv', 'krisenintervention', 'notfallseelsorge'] },
  { name: 'Logistikstützpunkt', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'stelle', organisation: 'thw', fachaufgabe: 'logistik' }, tags: ['logistik', 'stützpunkt', 'thw', 'versorgung'] },
  { name: 'Instandhaltungsstelle', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'instandhaltung' }, tags: ['instandhaltung', 'reparatur', 'werkstatt'] },
  { name: 'Veterinärstelle', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'veterinaerwesen' }, tags: ['veterinär', 'tier', 'tierschutz', 'tierarzt'] },
  { name: 'Leichensammelstelle', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'stelle' }, tags: ['leichen', 'tote', 'leichensammelstelle'] },
  { name: 'Vermisstensammelstelle', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'stelle' }, tags: ['vermisste', 'suchdienst', 'sammelstelle'] },

  // ===== INFRASTRUKTUR =====
  { name: 'Wasserentnahmestelle', kategorie: 'INFRASTRUKTUR', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'wasserversorgung' }, tags: ['wasser', 'entnahme', 'hydrant'] },
  { name: 'Trinkwasserversorgung', kategorie: 'INFRASTRUKTUR', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'versorgung-trinkwasser' }, tags: ['trinkwasser', 'wasser', 'versorgung'] },
  { name: 'Brauchwasserversorgung', kategorie: 'INFRASTRUKTUR', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'versorgung-brauchwasser' }, tags: ['brauchwasser', 'wasser', 'versorgung'] },
  { name: 'Stromversorgung', kategorie: 'INFRASTRUKTUR', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'versorgung-elektrizitaet' }, tags: ['strom', 'elektrizität', 'nea', 'generator'] },
  { name: 'Stromversorgung (ortsfest)', kategorie: 'INFRASTRUKTUR', zeichenDefinition: { grundzeichen: 'ortsfeste-stelle', fachaufgabe: 'versorgung-elektrizitaet' }, tags: ['strom', 'elektrizität', 'ortsfest'] },
  { name: 'Beleuchtungsstelle', kategorie: 'INFRASTRUKTUR', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'beleuchtung' }, tags: ['licht', 'beleuchtung', 'ausleuchtung'] },
  { name: 'IuK-Stelle', kategorie: 'INFRASTRUKTUR', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'iuk' }, tags: ['iuk', 'funk', 'kommunikation', 'fernmelder'] },
  { name: 'IuK-Stelle (ortsfest)', kategorie: 'INFRASTRUKTUR', zeichenDefinition: { grundzeichen: 'ortsfeste-stelle', fachaufgabe: 'iuk' }, tags: ['iuk', 'funk', 'kommunikation', 'ortsfest'] },
  { name: 'Sirene / Warnstelle', kategorie: 'INFRASTRUKTUR', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'warnen' }, tags: ['sirene', 'warnung', 'alarm', 'warnen'] },
  { name: 'Pumpstation', kategorie: 'INFRASTRUKTUR', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'pumpen' }, tags: ['pumpe', 'pumpen', 'lenzen', 'wasserschaden'] },
  { name: 'Betriebsstoffversorgung', kategorie: 'INFRASTRUKTUR', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'verbrauchsgueter' }, tags: ['betriebsstoff', 'kraftstoff', 'diesel', 'benzin', 'tankstelle'] },
  { name: 'Krankenhaus', kategorie: 'INFRASTRUKTUR', zeichenDefinition: { grundzeichen: 'ortsfeste-stelle', fachaufgabe: 'krankenhaus' }, tags: ['krankenhaus', 'klinik', 'hospital'] },
  { name: 'Gebäude allgemein', kategorie: 'INFRASTRUKTUR', zeichenDefinition: { grundzeichen: 'gebaeude' }, tags: ['gebäude', 'haus', 'bauwerk'] },
  { name: 'Gebäude Betreuung', kategorie: 'INFRASTRUKTUR', zeichenDefinition: { grundzeichen: 'gebaeude', organisation: 'hilfsorganisation', fachaufgabe: 'betreuung' }, tags: ['gebäude', 'betreuung', 'halle', 'turnhalle'] },
  { name: 'Gebäude Unterbringung', kategorie: 'INFRASTRUKTUR', zeichenDefinition: { grundzeichen: 'gebaeude', fachaufgabe: 'unterbringung' }, tags: ['gebäude', 'unterbringung', 'unterkunft'] },
  { name: 'Gebäude Verpflegung', kategorie: 'INFRASTRUKTUR', zeichenDefinition: { grundzeichen: 'gebaeude', fachaufgabe: 'verpflegung' }, tags: ['gebäude', 'verpflegung', 'küche', 'kantine'] },
  { name: 'Gebäude Führung', kategorie: 'INFRASTRUKTUR', zeichenDefinition: { grundzeichen: 'gebaeude', fachaufgabe: 'fuehrung' }, tags: ['gebäude', 'führung', 'stab', 'zentrale'] },
] as const;
