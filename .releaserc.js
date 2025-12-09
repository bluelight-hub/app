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
          template: `{{#if compareUrl}}
## Version [v{{nextRelease.version}}]({{compareUrl}}) – Veröffentlicht am {{datetime "yyyy-mm-dd"}}
{{else}}
## Version v{{nextRelease.version}} – Veröffentlicht am {{datetime "yyyy-mm-dd"}}
{{/if}}

{{#with commits}}

{{!-- Neue Funktionen (✨) --}}
{{#if sparkles}}
## ✨ Neue Funktionen
Die folgenden neuen Features wurden hinzugefügt:
{{#each sparkles}}
- {{> commitTemplate}}
{{/each}}
{{/if}}

{{!-- Fehlerbehebungen (🐛) --}}
{{#if bug}}
## 🐛 Fehlerbehebungen
Diese Probleme wurden behoben:
{{#each bug}}
- {{> commitTemplate}}
{{/each}}
{{/if}}

{{!-- Dringende Hotfixes (🚑) --}}
{{#if ambulance}}
## 🚑 Hotfixes
Dringende Hotfixes:
{{#each ambulance}}
- {{> commitTemplate}}
{{/each}}
{{/if}}

{{!-- Sicherheitsverbesserungen (🔒) --}}
{{#if lock}}
## 🔒 Sicherheitsverbesserungen
Sicherheitsrelevante Änderungen:
{{#each lock}}
- {{> commitTemplate}}
{{/each}}
{{/if}}

{{!-- Code-Aufräumarbeiten (🧹) --}}
{{#if broom}}
## 🧹 Codebereinigungen
Aufräumarbeiten und kleinere Verbesserungen:
{{#each broom}}
- {{> commitTemplate}}
{{/each}}
{{/if}}

{{!-- Refactoring (♻) --}}
{{#if recycle}}
## ♻ Refactoring
Struktur- oder Code-Verbesserungen:
{{#each recycle}}
- {{> commitTemplate}}
{{/each}}
{{/if}}

{{!-- Tool Improvements (🔧) --}}
{{#if wrench}}
## 🔧 Tool Verbesserungen
Verbesserungen an den Werkzeugen:
{{#each wrench}}
- {{> commitTemplate}}
{{/each}}
{{/if}}

{{!-- Breaking Changes (💥) --}}
{{#if boom}}
## 💥 Breaking Changes
Bitte beachtet folgende Änderungen, die möglicherweise Anpassungen erfordern:
{{#each boom}}
- {{> commitTemplate}}
{{/each}}
{{/if}}

{{/with}}`,
          partials: {
            commitTemplate: `[\`{{commit.short}}\`](https://github.com/{{owner}}/{{repo}}/commit/{{commit.short}}) {{subject}} 
{{#if issues}}(Zugehörige Issues: {{#each issues}}[\`{{text}}\`]({{link}}){{#unless @last}}, {{/unless}}{{/each}}){{/if}}
{{#if wip}}
WIP Änderungen:
{{#each wip}}
- [\`{{commit.short}}\`](https://github.com/{{owner}}/{{repo}}/commit/{{commit.short}}) {{subject}}
{{/each}}
{{/if}}`,
          },
          helpers: {
            datetime: (format = 'dd.mm.yyyy') => {
              const date = new Date();
              const utcDate = new Date(date.toUTCString().slice(0, -4));
              return format
                .replace('yyyy', utcDate.getUTCFullYear())
                .replace('mm', String(utcDate.getUTCMonth() + 1).padStart(2, '0'))
                .replace('dd', String(utcDate.getUTCDate()).padStart(2, '0'));
            },
          },
          issueResolution: {
            template: '{baseUrl}/{owner}/{repo}/issues/{ref}',
            baseUrl: 'https://github.com',
            source: 'github.com',
            removeFromCommit: false,
            regex: /#\d+/g,
          },
        },
      },
    ],
    '@semantic-release/release-notes-generator',
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
        successComment: false,
        failComment: false,
      },
    ],
  ],
};
