# Voorbeeldles: Groovescribe Module (Referentie-implementatie)

Titel: Mid-tempo funk pocket (1 maat) + variaties
Niveau: Beginner / Intermediair
Duur: 25-35 minuten
Doelgroep: Lespraktijk (docent + leerling)

## 1. Leerdoelen
- Leerling houdt een stabiele 16e-grid vast bij 92 BPM.
- Leerling speelt backbeat met accent op tel 2 en 4.
- Leerling begrijpt het verschil tussen basisgroove en variatie (mirror, orchestrate, simplify, extend).
- Docent kan dezelfde input embedden, analyseren en generator-ready maken zonder dat de embed breekt.

## 2. Context
Song/feel: Funk pocket, mid-tempo
Sectie: Verse groove (1 maat)
Tempo: 92 BPM
Maatsoort: 4/4

## 3. Groovescribe-input (bron)
### 3.1 Query (lossless)
```
?TimeSig=4/4&Div=16&Tempo=92&Measures=1&H=|x-x-x-x-x-x-x-x-|&S=|----O-------O---|&K=|o---o---o---o---|
```

### 3.2 Zelf-gehoste embed-URL
```
https://teacher.musicdott.com/groovescribe/?TimeSig=4/4&Div=16&Tempo=92&Measures=1&H=|x-x-x-x-x-x-x-x-|&S=|----O-------O---|&K=|o---o---o---o---|
```

### 3.3 iframe (input-voorbeeld)
```
<iframe src="https://teacher.musicdott.com/groovescribe/?TimeSig=4/4&Div=16&Tempo=92&Measures=1&H=|x-x-x-x-x-x-x-x-|&S=|----O-------O---|&K=|o---o---o---o---|"></iframe>
```

## 4. Verwachte Embed Module Output
```
{
  "type": "notation",
  "provider": "groovescribe",
  "embed": {
    "embed_url": "https://teacher.musicdott.com/groovescribe/?TimeSig=4/4&Div=16&Tempo=92&Measures=1&H=|x-x-x-x-x-x-x-x-|&S=|----O-------O---|&K=|o---o---o---o---|",
    "raw": "<iframe src=\"https://teacher.musicdott.com/groovescribe/?TimeSig=4/4&Div=16&Tempo=92&Measures=1&H=|x-x-x-x-x-x-x-x-|&S=|----O-------O---|&K=|o---o---o---o---|\"></iframe>"
  },
  "status": "embedded",
  "fallback": {
    "label": "Open Groovescribe",
    "url": "<iframe src=\"https://teacher.musicdott.com/groovescribe/?TimeSig=4/4&Div=16&Tempo=92&Measures=1&H=|x-x-x-x-x-x-x-x-|&S=|----O-------O---|&K=|o---o---o---o---|\"></iframe>"
  }
}
```

## 5. Interne Notatie (optioneel, parse-optional)
### 5.1 Verwachte translator output (ingekort)
```
{
  "status": "ok",
  "time_signature": { "beats": 4, "unit": 4 },
  "tempo": 92,
  "division": 16,
  "measures": 1,
  "grid": { "steps_per_measure": 16, "total_steps": 16 },
  "events": [
    { "step": 1, "instrument": "hihat", "velocity": 0.7, "accent": false, "limb": "U" },
    { "step": 3, "instrument": "hihat", "velocity": 0.7, "accent": false, "limb": "U" },
    { "step": 5, "instrument": "hihat", "velocity": 0.7, "accent": false, "limb": "U" },
    { "step": 7, "instrument": "hihat", "velocity": 0.7, "accent": false, "limb": "U" },
    { "step": 9, "instrument": "hihat", "velocity": 0.7, "accent": false, "limb": "U" },
    { "step": 11, "instrument": "hihat", "velocity": 0.7, "accent": false, "limb": "U" },
    { "step": 13, "instrument": "hihat", "velocity": 0.7, "accent": false, "limb": "U" },
    { "step": 15, "instrument": "hihat", "velocity": 0.7, "accent": false, "limb": "U" },

    { "step": 5, "instrument": "snare", "velocity": 0.7, "accent": true, "limb": "U" },
    { "step": 13, "instrument": "snare", "velocity": 0.7, "accent": true, "limb": "U" },

    { "step": 1, "instrument": "kick", "velocity": 0.7, "accent": false, "limb": "U" },
    { "step": 5, "instrument": "kick", "velocity": 0.7, "accent": false, "limb": "U" },
    { "step": 9, "instrument": "kick", "velocity": 0.7, "accent": false, "limb": "U" },
    { "step": 13, "instrument": "kick", "velocity": 0.7, "accent": false, "limb": "U" }
  ],
  "meta": { "source": "groovescribe-query", "confidence": "high", "errors": [] }
}
```

## 6. Lesverloop (docent/leerling)
### 6.1 Setup
- Docent plakt de input in de module.
- Groovescribe iframe links zichtbaar; interne grid rechts.
- Tempo staat op 92 BPM; 1 maat loop.

### 6.2 Basisgroove (5-7 min)
- Tel hardop 1e/2e/3e/4e + 16e-grid.
- Speel hi-hat constant, kick op 1 en 3, snare op 2 en 4 (accent).
- Focus op consistentie en feel.

### 6.3 Variaties (10-15 min)
1) Mirror (exact)
- Speel exact dezelfde groove.

2) Orchestrate (zelfde timing, andere klank)
- Verplaats hi-hat naar ride.
- Snare blijft accent, kick blijft gelijk.

3) Simplify (minder hits, zelfde timing)
- Hi-hat alleen op 8e-noten (stappen 1, 5, 9, 13).
- Kick en snare blijven identiek.

4) Extend (extra maat)
- Maat 2: voeg een eenvoudige fill toe in stappen 15-16 (tom of snare), timing blijft ongewijzigd.

## 7. Generator-ready blokken
### 7.1 Bronblok (1 maat)
```
{
  "block_id": "GS-001",
  "length_steps": 16,
  "events": [ ... ],
  "tags": ["groove", "groovescribe", "external"],
  "difficulty": 2,
  "source": { "type": "groovescribe", "url": "raw" }
}
```

### 7.2 Generator modes (MVP)
- Mirror: identiek aan GS-001
- Orchestrate: mapping hihat -> ride, timing intact
- Simplify: hihat alleen op stappen 1, 5, 9, 13
- Extend: tweede maat met korte fill in stappen 15-16

## 8. Fallback gedrag (lesbestendig)
- Als parsing faalt: links blijft Groovescribe draaien.
- Rechts: "Interne analyse niet beschikbaar".
- Geen layoutbreuk, geen stilte.

## 9. Beoordelingscriteria
- Timing stabiel op 92 BPM
- Accenten op snare hoorbaar
- Variaties behouden timing en feel
- Leerling kan verschil uitleggen tussen mirror/orchestrate/simplify/extend
