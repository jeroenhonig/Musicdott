const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const A4_FREQUENCY = 440;
const A4_MIDI_NUMBER = 69;

export interface DetectedNote {
  frequency: number;
  note: string;
  octave: number;
  cents: number;
  midiNumber: number;
  confidence: number;
}

export function frequencyToNote(frequency: number): DetectedNote | null {
  if (frequency <= 0 || !isFinite(frequency)) return null;

  const midiNumber = 12 * Math.log2(frequency / A4_FREQUENCY) + A4_MIDI_NUMBER;
  const roundedMidi = Math.round(midiNumber);
  const cents = Math.round((midiNumber - roundedMidi) * 100);
  
  const noteIndex = ((roundedMidi % 12) + 12) % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;
  const note = NOTE_NAMES[noteIndex];

  return {
    frequency,
    note,
    octave,
    cents,
    midiNumber: roundedMidi,
    confidence: 1 - Math.abs(cents) / 50
  };
}

export function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);

  if (rms < 0.01) return -1;

  let r1 = 0, r2 = SIZE - 1;
  const threshold = 0.2;

  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < threshold) {
      r1 = i;
      break;
    }
  }

  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < threshold) {
      r2 = SIZE - i;
      break;
    }
  }

  const trimmedBuffer = buffer.slice(r1, r2);
  const trimmedSize = trimmedBuffer.length;

  const correlations = new Array(trimmedSize).fill(0);
  for (let i = 0; i < trimmedSize; i++) {
    for (let j = 0; j < trimmedSize - i; j++) {
      correlations[i] += trimmedBuffer[j] * trimmedBuffer[j + i];
    }
  }

  let d = 0;
  while (correlations[d] > correlations[d + 1]) {
    d++;
    if (d >= trimmedSize - 1) return -1;
  }

  let maxCorrelation = -1;
  let maxIndex = -1;
  for (let i = d; i < trimmedSize; i++) {
    if (correlations[i] > maxCorrelation) {
      maxCorrelation = correlations[i];
      maxIndex = i;
    }
  }

  if (maxIndex === -1) return -1;

  let shift = maxIndex;
  if (maxIndex > 0 && maxIndex < trimmedSize - 1) {
    const y1 = correlations[maxIndex - 1];
    const y2 = correlations[maxIndex];
    const y3 = correlations[maxIndex + 1];
    const a = (y1 + y3 - 2 * y2) / 2;
    const b = (y3 - y1) / 2;
    if (a !== 0) {
      shift = maxIndex - b / (2 * a);
    }
  }

  return sampleRate / shift;
}

export function noteToABC(note: string, octave: number): string {
  const lowerNote = note.replace('#', '');
  const isSharp = note.includes('#');
  
  if (octave >= 5) {
    const abcNote = lowerNote.toLowerCase();
    const octaveMarker = "'".repeat(Math.max(0, octave - 5));
    return isSharp ? `^${abcNote}${octaveMarker}` : `${abcNote}${octaveMarker}`;
  } else {
    const abcNote = lowerNote.toUpperCase();
    const octaveMarker = ",".repeat(Math.max(0, 4 - octave));
    return isSharp ? `^${abcNote}${octaveMarker}` : `${abcNote}${octaveMarker}`;
  }
}

export function noteToMusicXML(notes: DetectedNote[]): string {
  const measures = [];
  let currentMeasure: string[] = [];
  
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const step = note.note.replace('#', '');
    const alter = note.note.includes('#') ? '<alter>1</alter>' : '';
    
    currentMeasure.push(`
      <note>
        <pitch>
          <step>${step}</step>
          ${alter}
          <octave>${note.octave}</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>`);
    
    if (currentMeasure.length >= 4 || i === notes.length - 1) {
      measures.push(`
    <measure number="${measures.length + 1}">
      ${currentMeasure.join('')}
    </measure>`);
      currentMeasure = [];
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Transcription</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    ${measures.join('')}
  </part>
</score-partwise>`;
}
