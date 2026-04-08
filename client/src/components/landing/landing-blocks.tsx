const BLOCKS = [
  { icon: "▶️", title: "YouTube", sub: "Video-uitleg" },
  { icon: "🥁", title: "GrooveScribe", sub: "Drumpatronen" },
  { icon: "🎵", title: "Bladmuziek", sub: "Notatie" },
  { icon: "🎸", title: "Tablature", sub: "Gitaartabs" },
  { icon: "📄", title: "PDF", sub: "Partituren" },
  { icon: "🎼", title: "Flat.io", sub: "Interactieve noten" },
  { icon: "🔤", title: "ABC-notatie", sub: "Tekstnotatie" },
  { icon: "🎧", title: "Spotify", sub: "Voorbeeldtracks" },
  { icon: "🍎", title: "Apple Music", sub: "Muziekbibliotheek" },
  { icon: "📝", title: "Tekst", sub: "Uitleg & theorie" },
  { icon: "🔊", title: "Audio", sub: "Oefenopnames" },
  { icon: "🖼️", title: "Afbeeldingen", sub: "Foto's & schema's" },
  { icon: "🎯", title: "Akkoorddiagram", sub: "Akkoordschema's" },
  { icon: "🎤", title: "Songtekst", sub: "Teksten & lyrics" },
  { icon: "🎙️", title: "Audio → Noten", sub: "Transcriptie" },
  { icon: "🔗", title: "Externe link", sub: "Webinhoud" },
  { icon: "🔄", title: "Sync-embed", sub: "Gesynchroniseerd" },
  { icon: "🗂️", title: "Galerij", sub: "Fotogalerij" },
  { icon: "🃏", title: "Rich link", sub: "Link met preview" },
] as const;

export function LandingBlocks() {
  return (
    <section className="bg-gray-50 py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-flex text-xs font-bold tracking-widest uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full mb-4">
            Lesinhoud
          </span>
          <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.03em] text-[#1B2B6B] mb-3 leading-tight">
            19 bloktypen voor élke les
          </h2>
          <p className="text-lg text-gray-500 max-w-md mx-auto">
            Van bladmuziek tot YouTube, van drumtabs tot Spotify. Alles in één leseditor.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {BLOCKS.map((block) => (
            <div
              key={block.title}
              className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-[#1B2B6B]/30 transition-colors"
            >
              <span className="text-xl flex-shrink-0">{block.icon}</span>
              <div>
                <div className="text-sm font-semibold text-[#1B2B6B]">{block.title}</div>
                <div className="text-xs text-gray-400">{block.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
