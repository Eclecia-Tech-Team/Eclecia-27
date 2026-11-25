/* eslint-disable @next/next/no-img-element */
import { ASSETS } from "@/constants/assets";
import { atlasArt } from "@/constants/events";

/** Same chakra frame (and fallback) the phone atlas uses around the selected event. */
const CHAKRA = ASSETS.cloudinary.chakraFrame || "/assets/opt/events/mobile/chakra-frame-v1.webp";

/**
 * Desktop: the event's world exactly as the atlas's event scene draws it
 * (corona halo, the orbit ring passing behind and in front of the planet,
 * the painted planet and the event art), so "Discover event" lands on the
 * same picture it left.
 */
export function EventOrbitPlanet({ art }: { art: string }) {
  return (
    <div className="ev-op" aria-hidden>
      <img className="ev-op-halo" src={atlasArt.shared("corona-halo")} alt="" draggable={false} />
      <img className="ev-op-ring" data-half="rear" src={atlasArt.shared("event-orbit")} alt="" draggable={false} />
      <img className="ev-op-base" src={atlasArt.shared("planet-base")} alt="" draggable={false} />
      <img className="ev-op-art" src={art} alt="" draggable={false} fetchPriority="high" />
      <img className="ev-op-ring" data-half="front" src={atlasArt.shared("event-orbit")} alt="" draggable={false} />
    </div>
  );
}

/** Phones: the event inside the turning chakra, as the phone atlas shows it. */
export function EventWorld({ art }: { art: string }) {
  return (
    <div className="ev-world" aria-hidden>
      <img className="ev-world-corona" src={atlasArt.shared("corona-halo")} alt="" draggable={false} />
      <div className="ev-world-chakra">
        <img src={CHAKRA} alt="" draggable={false} />
      </div>
      <img className="ev-world-base" src={atlasArt.shared("planet-base")} alt="" draggable={false} />
      <img className="ev-world-art" src={art} alt="" draggable={false} />
    </div>
  );
}

/** A smaller planet for the other events of the same world. */
export function EventPlanet({ art }: { art: string }) {
  return (
    <span className="ev-planet" aria-hidden>
      <img className="ev-planet-halo" src={atlasArt.shared("corona-halo")} alt="" loading="lazy" draggable={false} />
      <img className="ev-planet-base" src={atlasArt.shared("planet-base")} alt="" loading="lazy" draggable={false} />
      <img className="ev-planet-art" src={art} alt="" loading="lazy" draggable={false} />
    </span>
  );
}
