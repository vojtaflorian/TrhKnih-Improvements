# TrhKnih Improvements

Tampermonkey skript pro vylepšení uživatelského rozhraní a automatizaci na [TrhKnih.cz](https://www.trhknih.cz).

## 📋 Funkce

### ✨ Automatické předvyplnění formulářů
- **Stav knihy**: Automaticky nastaví na "Velmi dobrý"
- **Doručení**: Aktivuje doručení s nastavením váhové kategorie "do 1 kg"
- **Osobní předání**: Automaticky zaškrtne preferovaná místa předání

### 🎨 Vylepšení rozhraní
- **Přeuspořádání nabídek**: Poptávky a historii prodejů přesune nad aktuální nabídky
- **Skrytí nepotřebných elementů**: Odstraní tagy a výběr kreditů/regálů
- **Průměrná cena**: Vypočítá a zobrazí průměrnou cenu z aktuálních nabídek

### 🔍 Vylepšení vyhledávání
- **Tlačítko pro vymazání**: Přidá křížek pro rychlé vymazání vyhledávacího pole

### ⚡ Další funkce
- **Monitorování URL**: Automaticky znovu inicializuje funkce při změně stránky
- **Robustní logging**: Detailní systém logování s různými úrovněmi (DEBUG, INFO, WARN, ERROR)
- **Resource management**: Správa timeoutů a observerů s automatickým čištěním

## 🚀 Instalace

### 1. Nainstalujte Tampermonkey
- [Chrome/Edge](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
- [Safari](https://apps.apple.com/us/app/tampermonkey/id1482490089)

### 2. Nainstalujte skript
Klikněte na následující odkaz:

**[📥 Nainstalovat TrhKnih Improvements](https://raw.githubusercontent.com/vojtaflorian/TrhKnih-Improvements/refs/heads/main/TrhKnih-improvements.user.js)**

## 🛠️ Konfigurace

Skript lze upravit editací konfiguračního objektu `CONFIG` v kódu:

```javascript
const CONFIG = {
    // Logování
    logging: {
        enabled: true,
        level: 'INFO', // DEBUG, INFO, WARN, ERROR
    },

    // Předvyplnění formuláře
    form: {
        shapeValue: 'Velmi dobrý',
        weightCategoryValue: '2', // "do 1 kg"
        handoverValues: ['3456', '9467', '10637'], // ID míst předání
    },

    // ... další nastavení
};
```

## 📊 Architektura

Skript používá modulární architekturu s následującími komponenty:

- **Logger**: Centralizovaný systém logování
- **ResourceManager**: Správa timeoutů, intervalů a MutationObservers
- **FormAutoFiller**: Automatické vyplňování formulářů
- **DOMManipulator**: Manipulace s DOM elementy
- **PriceCalculator**: Výpočet průměrné ceny
- **SearchBoxEnhancer**: Vylepšení vyhledávacího pole
- **URLMonitor**: Monitorování změn URL
- **ApplicationManager**: Hlavní koordinátor všech modulů

## 🐛 Debugging

Pro zapnutí debug módu změňte úroveň logování:

```javascript
CONFIG.logging.level = 'DEBUG';
```

Debug výstupy jsou dostupné v konzoli prohlížeče (F12).

Globální instance aplikace:
```javascript
window.TrhKnihEnhanced.app // Instance aplikace
window.TrhKnihEnhanced.version // Verze skriptu
window.TrhKnihEnhanced.config // Konfigurace
```

## 📝 Changelog

### v2.0.0 (2025-09-29)
- ✅ Kompletní přepsání do modulární architektury
- ✅ Přidán robustní logging systém
- ✅ Implementován resource management
- ✅ Vylepšené error handling
- ✅ URL monitoring pro SPA navigaci

### v1.0.0
- 🎉 Prvotní verze

## 👤 Autor

**Vojta Florian**

## 📄 Licence

Tento projekt je dostupný pod MIT licencí.

## 🤝 Přispívání

Pull requesty jsou vítány! Pro větší změny prosím nejprve otevřete issue a prodiskutujte, co byste chtěli změnit.

## ⚠️ Upozornění

Tento skript není oficiálně podporován TrhKnih.cz a je poskytován "jak je" bez jakýchkoliv záruk.
