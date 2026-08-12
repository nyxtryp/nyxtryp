import { useState } from 'react'

export default function Scene() {
  const [entered, setEntered] = useState(false)

  return (
    <div className="scene">
      {!entered ? (
        <section className="intro">
          <p className="artist">NYXTRYP</p>

          <h1>DON'T LISTEN. ENTER.</h1>

          <button
            className="enter-button"
            onClick={() => setEntered(true)}
          >
            ENTER
          </button>
        </section>
      ) : (
        <section className="universe">
          <div className="universe-title">
            NYXTRYP UNIVERSE
          </div>
        </section>
      )}
    </div>
  )
}
