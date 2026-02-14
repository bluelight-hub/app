/**
 * @type {import('semantic-release').GlobalConfig}
 */
module.exports = {
  repositoryUrl: 'https://github.com/rubenvitt/bluelight-hub',
  plugins: [
    [
      'semantic-release-gitmoji',
      {
        releaseRules: {
          major: ['💥'],
          minor: ['✨'],
          patch: ['🐛', '🚑', '🔒', '🧹', '♻️', '🔧'],
        },
        releaseNotes: {
          template: '',
        },
      },
    ],
    [
      'semantic-release-claude-changelog',
      {
        escaping: 'none',
        promptTemplate: `Erstelle Release Notes für Version {{version}} (veröffentlicht am {{date}}) des Projekts Bluelight Hub – eine Desktop & Web App für Blaulicht-Organisationen im Katastrophenschutz.

Hier sind die Commits dieses Releases:

\`\`\`json
{{commits}}
\`\`\`

{{#additionalContext}}
Zusätzlicher Kontext:

\`\`\`json
{{additionalContext}}
\`\`\`
{{/additionalContext}}

WICHTIG: Deine Antwort darf NUR die Release Notes im Markdown-Format enthalten. Kein zusätzlicher Text, keine Erklärungen.

Die Release Notes sollen:

1. Auf Deutsch geschrieben sein
2. Änderungen thematisch nach Feature-Bereichen gruppieren (z.B. "Erinnerungen", "ETB-Integration", "Vorlagen") statt nach Commit-Typ (Feature/Bugfix)
3. Technische Commit-Messages in benutzerfreundliche Beschreibungen übersetzen
4. Wichtige Änderungen hervorheben, die Nutzer betreffen
5. Rein technische Commits weglassen (CI-Fixes, Biome-Config, Refactoring ohne User-Impact, Release-Pipeline-Änderungen)
6. Bugfixes den jeweiligen Feature-Bereichen zuordnen, nicht separat auflisten
7. Keine Commit-Hashes, keine Story-Nummern, keine internen Tracking-IDs
8. Markdown-Formatierung mit ## für Abschnitts-Überschriften
9. Kompakt und scanbar – Qualität vor Quantität
10. Bei Breaking Changes (💥) diese prominent am Anfang hervorheben

Starte direkt mit dem Versions-Header im Format: ## v{{version}}`,
      },
    ],
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
      },
    ],
    [
      '@semantic-release/exec',
      {
        prepareCmd: [
          'jq \'.version="${nextRelease.version}"\' packages/frontend/package.json > packages/frontend/package.json.tmp && mv packages/frontend/package.json.tmp packages/frontend/package.json',
          'jq \'.version="${nextRelease.version}"\' packages/backend/package.json > packages/backend/package.json.tmp && mv packages/backend/package.json.tmp packages/backend/package.json',
          'jq \'.version="${nextRelease.version}"\' packages/shared/package.json > packages/shared/package.json.tmp && mv packages/shared/package.json.tmp packages/shared/package.json',
        ].join(' && '),
        successCmd: 'cat RELEASE_NOTES.md >> $GITHUB_STEP_SUMMARY || true',
      },
    ],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'packages/frontend/package.json', 'packages/backend/package.json', 'packages/shared/package.json'],
        message: '🔖(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
    [
      '@semantic-release/github',
      {
        assets: [
          'CHANGELOG.md',
          'frontend-artifacts/**/*.dmg',
          'frontend-artifacts/**/*.AppImage',
          'frontend-artifacts/**/*.msi',
          'frontend-artifacts/**/*.app',
          'frontend-artifacts/**/*.exe',
          'frontend-artifacts/**/*.deb',
        ],
        successComment: '🎉 Dieses Issue/PR wurde im Release [v${nextRelease.version}](${releases.filter(release => release.name)[0]?.url || ""}) veröffentlicht.',
        failComment: '❌ Das Release ist fehlgeschlagen. Details in den [CI Logs](${branch.url}).',
      },
    ],
  ],
};
