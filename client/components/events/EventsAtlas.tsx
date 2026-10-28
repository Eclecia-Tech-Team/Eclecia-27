/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef } from "react";
import { SiteHeader } from "@/components/common/Header";
import { ATLAS_EVENT_COUNT, atlasArt } from "@/constants/events";
import { mountAtlas } from "./atlas/engine";
import "@/styles/events-atlas.css";

/**
 * /events: the Events Atlas. Seven category worlds orbit an eclipse; choosing
 * one dives into its world of event planets. Static markup lives here; the
 * orbit, transitions and dialogs are driven imperatively by `mountAtlas`.
 * The site header sits outside the atlas root so its scoped styles never
 * reach it.
 */
export function EventsAtlas() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    return mountAtlas(rootRef.current);
  }, []);

  return (
    <>
      <SiteHeader />
      <div ref={rootRef} className="events-atlas" data-mode="atlas" data-intro="pending">
        <div className="sky" aria-hidden>
          <div className="sky-texture" />
          <img className="dust" src={atlasArt.shared("gold-dust")} alt="" />
          <div className="vignette" />
        </div>

        <main id="main" tabIndex={-1}>
          <section id="overview" aria-label="Choose an event category">
            <div className="intro">
              <p className="eyebrow">THE EVENTS ATLAS</p>
              <h1>
                Every art,
                <br />a universe.
              </h1>
              <p className="intro-note">Drag to rotate.</p>
            </div>
            <div id="atlas-camera">
              <div id="category-worlds" />
            </div>
            <img className="foreground" src={atlasArt.shared("silk-foreground")} alt="" aria-hidden />
            <footer className="atlas-footer">
              <button id="browse-bottom">
                Discover all {ATLAS_EVENT_COUNT} events <span aria-hidden>↗</span>
              </button>
            </footer>
          </section>

          <section id="event-scene" aria-label="Explore category events" hidden inert>
            <div className="event-breadcrumb">
              <button id="back">
                <span aria-hidden>←</span> All categories
              </button>
              <span className="breadcrumb-rule" />
              <span id="breadcrumb" />
            </div>
            <img className="immersive-corona" src={atlasArt.shared("corona-halo")} alt="" aria-hidden />
            <div id="planet-system" />
            <div className="event-copy" id="event-copy" aria-live="polite" aria-atomic="true">
              <p className="eyebrow" id="world-label" />
              <p className="category-line" id="category-line" />
              <h1 id="event-title" />
              <p id="event-description" />
              <div className="event-meta">
                <span id="event-kind" />
                <span id="event-counter" />
              </div>
              <button className="outline-button" id="discover">
                Discover event <span aria-hidden>↗</span>
              </button>
            </div>
            <nav className="event-progress" id="event-progress" aria-label="Events in this category" />
            <div className="event-bottom">
              <nav className="category-dock" id="category-dock" aria-label="Switch category" />
              <div className="journey-controls">
                <button id="previous" aria-label="Previous event">
                  ←
                </button>
                <span id="journey-label" />
                <button id="next" aria-label="Next event">
                  →
                </button>
              </div>
            </div>
          </section>
          <div id="scroll-track" aria-hidden />
        </main>

        <dialog id="directory" className="directory">
          <div className="dialog-heading">
            <div>
              <p className="eyebrow">ALL SEVEN WORLDS</p>
              <h2>Find your stage.</h2>
            </div>
            <button className="close-button" data-close="directory" aria-label="Close event directory">
              ×
            </button>
          </div>
          <label className="search-label" htmlFor="event-search">
            Search events or categories
          </label>
          <input id="event-search" type="search" placeholder="A voice, a canvas, a world…" autoComplete="off" />
          <div className="directory-filters" id="directory-filters" aria-label="Filter by category" />
          <div className="directory-results" id="directory-results" />
          <p className="no-results" id="no-results" hidden>
            No worlds found. Try another search.
          </p>
        </dialog>

        <dialog id="event-detail" className="event-detail">
          <button className="close-button" data-close="event-detail" aria-label="Close event details">
            ×
          </button>
          <img id="detail-art" alt="" />
          <div>
            <p className="eyebrow" id="detail-category" />
            <h2 id="detail-title" />
            <p id="detail-description" />
            <p className="announcement">Competition details and registration will be announced.</p>
            <button className="outline-button" data-close="event-detail">
              Back to the world <span aria-hidden>↗</span>
            </button>
          </div>
        </dialog>

        <div className="load-status" id="load-status" role="status">
          Preparing the atlas…
        </div>
      </div>
    </>
  );
}
