/* eslint-disable @next/next/no-img-element */
import { ASSETS } from "@/constants/assets";
import { atlasArt } from "@/constants/events";
import { depth } from "@/lib/depth";

/**
 * The hero picture: the event on stage. An arched window holds the night sky
 * with the fest's eclipse at its crown (as on the landing, the schedule and
 * the sign-in card) and the landing's hills at its foot; the event's art
 * stands in front, a little proud of the frame.
 *
 * Deliberately not the atlas's planet-on-an-orbit: "Discover event" should
 * land somewhere new, not on the picture it just left. The eclipse and the
 * figure sit at their own depths for the site's mouse parallax.
 */
export function EventStage({ art }: { art?: string }) {
  return (
    <div className="ev-stage" aria-hidden>
      <div className="ev-stage-frame">
        <img className="ev-stage-dust" src={atlasArt.shared("gold-dust")} alt="" draggable={false} />
        <div className="ev-stage-eclipse" style={depth(5)}>
          <img className="ev-stage-rays" src={ASSETS.cloudinary.blacksun} alt="" draggable={false} />
          <img className="ev-stage-disc" src={ASSETS.cloudinary.blacksun2} alt="" draggable={false} />
          {/* The landing's gold sun-flower: its head shows above the event's art, its stem runs down behind it. */}
          <img className="ev-stage-flower" src={ASSETS.cloudinary.minisun} alt="" draggable={false} />
        </div>
        <img className="ev-stage-ground" src={ASSETS.cloudinary.bottom} alt="" draggable={false} />
      </div>
      {art && (
        <div className="ev-stage-figure" style={depth(-9)}>
          <img className="ev-stage-art" src={art} alt="" draggable={false} fetchPriority="high" />
        </div>
      )}
      {/* Lotus finial on the crown of the arch (the bud from the gold buttons). */}
      <svg className="ev-stage-finial" width="30" height="24" viewBox="0 0 30 24">
        <path d="M15 1 C19 7 19 16 15 23 C11 16 11 7 15 1 Z" fill="#d9a441" />
        <path d="M6 8 C12 11 13.5 17 13 23 C8.5 20 5.5 14.5 6 8 Z" fill="#d9a441" opacity="0.7" />
        <path d="M24 8 C18 11 16.5 17 17 23 C21.5 20 24.5 14.5 24 8 Z" fill="#d9a441" opacity="0.7" />
      </svg>
    </div>
  );
}

/**
 * The hero's stage in miniature, for the other events of the same world: a
 * small arched niche with the eclipse, the hills and the event's art. A row
 * of them reads as an arcade.
 */
export function EventNiche({ art }: { art: string }) {
  return (
    <span className="ev-niche" aria-hidden>
      <span className="ev-niche-frame">
        <img className="ev-niche-eclipse" src={ASSETS.cloudinary.blacksun} alt="" loading="lazy" draggable={false} />
        <img className="ev-niche-ground" src={ASSETS.cloudinary.bottom} alt="" loading="lazy" draggable={false} />
      </span>
      <img className="ev-niche-art" src={art} alt="" loading="lazy" draggable={false} />
    </span>
  );
}
