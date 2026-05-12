export interface SeedStateUser {
  username: string;
  password: string;
  userId: string;
  role: 'SICHERHEITSBEAUFTRAGTER' | 'ABSCHNITTSLEITER' | 'EINHEITSFUEHRER' | 'NACHBEREITUNG' | 'ADMIN';
  storageStateFile: string;
}

export interface SeedState {
  marker: string;
  einsatzId: string;
  abschnitte: Array<{ id: string; name: string; einheitId: string }>;
  users: {
    markus: SeedStateUser;
    steffi1: SeedStateUser;
    steffi2: SeedStateUser;
    steffi3: SeedStateUser;
    einheitsfuehrer: SeedStateUser;
    sabine: SeedStateUser;
  };
  serverAccessToken: string;
  backendBaseUrl: string;
  frontendBaseUrl: string;
}
