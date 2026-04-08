export function LandingStatement() {
  return (
    <section className="bg-[#1B2B6B] py-24 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h2
          className="font-black tracking-[-0.04em] leading-[1.02] text-white mb-5"
          style={{ fontSize: "clamp(40px, 6vw, 72px)" }}
        >
          Eén platform.<br />
          <em className="not-italic text-[#F5B800]">Gebouwd voor de docent.</em>
        </h2>
        <p className="text-lg text-white/60 leading-relaxed max-w-lg mx-auto">
          MusicDott is niet gebouwd voor de administrateur of de schooldirecteur.
          Het is gebouwd voor jou — de docent die betrokken wil zijn, lessen wil
          maken die blijven hangen, en precies wil weten hoe zijn leerlingen groeien.
        </p>
      </div>
    </section>
  );
}
