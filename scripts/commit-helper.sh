#!/bin/bash

# Commit Helper Script - Erzwingt korrekte Commit-Nachrichten
# Basierend auf 030-commit-rules.mdc

echo "🚀 Bluelight-Hub Commit Helper"
echo "==============================="

# Prüfe ob es Änderungen gibt
if ! git diff --staged --quiet; then
    echo "📁 Staged Changes gefunden:"
    git diff --staged --name-only | sed 's/^/  ✓ /'
    echo ""
else
    echo "⚠️  Keine staged Changes gefunden!"
    echo "🔧 Alle Änderungen automatisch stagen? (y/N)"
    read -r stage_all
    if [[ $stage_all =~ ^[Yy]$ ]]; then
        git add .
        echo "✅ Alle Änderungen gestaged"
        echo ""
    else
        echo "❌ Bitte zuerst Änderungen stagen: git add <files>"
        exit 1
    fi
fi

# Emoji-Auswahl
echo "📝 Wähle den Commit-Typ:"
echo "  1) ✨ Feature (neue Funktionalität)"
echo "  2) 🐛 Bugfix (Fehlerbehebung)" 
echo "  3) 🔧 Config (Konfiguration/Tooling)"
echo "  4) 📝 Docs (Dokumentation)"
echo "  5) ♻️  Refactor (Code-Umstrukturierung)"
echo "  6) 🧪 Test (Tests hinzufügen/korrigieren)"
echo "  7) 💄 Style (UI/CSS Änderungen)"
echo "  8) ⚡ Performance (Performance-Verbesserung)"
echo "  9) 🚑 Hotfix (kritischer Hotfix)"
echo " 10) 💥 Breaking (Breaking Change)"
echo " 11) 🧹 Cleanup (Code-Aufräumarbeiten)"
echo " 12) 🔒 Security (Sicherheitsverbesserung)"
echo " 13) 📦 Deps (Dependencies aktualisiert)"
echo " 14) 🗑 Remove (Code/Feature entfernt)"
echo " 15) 🛠 Fix (Allgemeine Fixes)"
echo " 16) 🚀 Deploy (Deployment-bezogen)"
echo " 17) 🎉 Initial (Initial commit)"

read -p "Auswahl (1-17): " choice

case $choice in
    1) emoji="✨"; type="Feature" ;;
    2) emoji="🐛"; type="Bugfix" ;;
    3) emoji="🔧"; type="Config" ;;
    4) emoji="📝"; type="Docs" ;;
    5) emoji="♻️"; type="Refactor" ;;
    6) emoji="🧪"; type="Test" ;;
    7) emoji="💄"; type="Style" ;;
    8) emoji="⚡"; type="Performance" ;;
    9) emoji="🚑"; type="Hotfix" ;;
    10) emoji="💥"; type="Breaking" ;;
    11) emoji="🧹"; type="Cleanup" ;;
    12) emoji="🔒"; type="Security" ;;
    13) emoji="📦"; type="Deps" ;;
    14) emoji="🗑"; type="Remove" ;;
    15) emoji="🛠"; type="Fix" ;;
    16) emoji="🚀"; type="Deploy" ;;
    17) emoji="🎉"; type="Initial" ;;
    *) echo "❌ Ungültige Auswahl!"; exit 1 ;;
esac

# Context eingeben
echo ""
read -p "🏷️  Context (z.B. frontend, backend, shared): " context

# Kurze Beschreibung
echo ""
read -p "📋 Kurze Beschreibung (max. 50 Zeichen): " short_desc

if [ ${#short_desc} -gt 50 ]; then
    echo "⚠️  Beschreibung zu lang (${#short_desc} Zeichen, max. 50)"
    echo "🔄 Bitte kürzen..."
    exit 1
fi

# Detaillierte Beschreibung
echo ""
echo "📝 Detaillierte Beschreibung:"
read -p "> " detailed_desc

# Stichpunkte sammeln
echo ""
echo "📌 Stichpunkte (Enter ohne Eingabe zum Beenden):"
bullet_points=()
counter=1

while true; do
    read -p "  $counter) " bullet
    if [ -z "$bullet" ]; then
        break
    fi
    bullet_points+=("- $bullet")
    ((counter++))
done

# Breaking Change Warnung
if [ "$emoji" = "💥" ]; then
    echo ""
    read -p "⚠️  Breaking Change Beschreibung: " breaking_desc
fi

# Commit-Message zusammenbauen
echo ""
echo "📄 Erstelle Commit-Message..."

{
    echo "$emoji($context): $short_desc"
    echo ""
    echo "$detailed_desc"
    for bullet in "${bullet_points[@]}"; do
        echo "$bullet"
    done
    
    if [ "$emoji" = "💥" ] && [ -n "$breaking_desc" ]; then
        echo ""
        echo "💥 BREAKING CHANGE: $breaking_desc"
    fi
} > commit-message.txt

# Vorschau anzeigen
echo ""
echo "📋 Commit-Message Vorschau:"
echo "================================="
cat commit-message.txt
echo "================================="
echo ""

# Bestätigung
read -p "✅ Commit erstellen? (Y/n): " confirm
if [[ ! $confirm =~ ^[Nn]$ ]]; then
    git commit -F commit-message.txt
    rm commit-message.txt
    echo ""
    echo "🎉 Commit erfolgreich erstellt!"
    echo "🔍 Letzter Commit:"
    git log --oneline -1
else
    echo "❌ Commit abgebrochen"
    rm commit-message.txt
fi 