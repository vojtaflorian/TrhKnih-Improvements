# TrhKnih Improvements

Tampermonkey skript pro vylepšení [TrhKnih.cz](https://www.trhknih.cz)

## Co to dělá

- **Automaticky předvyplní formulář** při přidávání knihy (stav, doručení, místa předání)
- **Vypočítá průměrnou cenu** z aktuálních nabídek
- **Přesune poptávky nahoru** nad nabídky
- **Přidá křížek** pro smazání vyhledávacího pole
- **Skryje** nepotřebné prvky (tagy, kredity)

## Instalace

1. Nainstalujte [Tampermonkey](https://www.tampermonkey.net/)
2. Klikněte: **[Nainstalovat skript](https://raw.githubusercontent.com/vojtaflorian/TrhKnih-Improvements/refs/heads/main/TrhKnih-improvements.user.js)**

## Konfigurace

Nastavení najdete v sekci `CONFIG` v kódu skriptu:

```javascript
form: {
    shapeValue: 'Velmi dobrý',
    weightCategoryValue: '2', // do 1 kg
    handoverValues: ['3456', '9467', '10637'], // vaše místa předání
}
```

## Autor

Vojta Florian
