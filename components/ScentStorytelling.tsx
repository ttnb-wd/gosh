const phrases = ["Find your signature", "Wear your mood", "Leave a memory", "Scent, reimagined"];

export default function ScentStorytelling() {
  return <section className="studio-storytelling" aria-label="Find your signature fragrance">
    <h2 className="sr-only">Find your signature. Wear your mood. Leave a memory.</h2>
    <div className="studio-storytelling-track" aria-hidden="true">
      {[0, 1].map(copy => <div key={copy} className="studio-storytelling-copy">{phrases.map(phrase => <span key={phrase} className="flex items-center gap-10"><span className="studio-gradient">{phrase}</span><small>GOSH</small></span>)}</div>)}
    </div>
    <p className="studio-storytelling-notes"><span>FLORAL</span><span>WOODY</span><span>AMBER</span><span>FRESH</span><span>MUSK</span></p>
  </section>;
}
