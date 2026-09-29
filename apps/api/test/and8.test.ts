import { describe, expect, it } from "vitest";
import { inferDates, parseDetail, parseListing } from "../src/scrapers/and8";

const NOW = new Date(Date.UTC(2026, 8, 29));

describe("inferDates", () => {
  it("handles single days, ranges and year rollover", () => {
    expect(inferDates("Oct 10th", NOW)).toEqual({ startDate: "2026-10-10", endDate: "2026-10-10" });
    expect(inferDates("Oct 2nd - 4th", NOW)).toEqual({ startDate: "2026-10-02", endDate: "2026-10-04" });
    expect(inferDates("Sep 30th - Oct 2nd", NOW)).toEqual({ startDate: "2026-09-30", endDate: "2026-10-02" });
    expect(inferDates("Jan 3rd", NOW)).toEqual({ startDate: "2027-01-03", endDate: "2027-01-03" });
    expect(inferDates("Dec 30th - Jan 2nd", NOW)).toEqual({ startDate: "2026-12-30", endDate: "2027-01-02" });
  });
  it("uses the explicit year when present", () => {
    expect(inferDates("Feb 19th - 21st 2027", NOW)).toEqual({ startDate: "2027-02-19", endDate: "2027-02-21" });
    expect(inferDates("Jul 30th - Aug 1st 2027", NOW)).toEqual({ startDate: "2027-07-30", endDate: "2027-08-01" });
    expect(inferDates("Dec 30th - Jan 2nd 2027", NOW)).toEqual({ startDate: "2026-12-30", endDate: "2027-01-02" });
  });
  it("keeps events that just started", () => {
    expect(inferDates("Sep 28th - 29th", NOW)).toEqual({ startDate: "2026-09-28", endDate: "2026-09-29" });
  });
  it("returns null on garbage", () => {
    expect(inferDates("soon", NOW)).toBeNull();
  });
});

const LISTING = `<table><tr class="d_list">
  <td class="dateRange">Oct 10<sup>th</sup><br>in 11 days</td>
  <td><u><a href="fr/e/5417">Breaking Austrian (Youth) Open 2026</a></u> (Battle)</td>
  <td><img alt="AT" title="Austria"> Asten</td></tr>
  <tr class="d_list"><td>x</td></tr></table>`;

describe("parseListing", () => {
  it("extracts the category from outside the title", () => {
    const [ev, ...rest] = parseListing(LISTING, NOW);
    expect(rest).toHaveLength(0);
    expect(ev).toMatchObject({
      externalId: "5417",
      title: "Breaking Austrian (Youth) Open 2026",
      category: "Battle",
      startDate: "2026-10-10",
      countryCode: "AT",
      url: "https://and8.dance/en/e/5417",
    });
  });
});

const DETAIL = `<div class="event_location"><b><img alt="FR" title="France"> La pyramide</b><br>4 Rue Racine, 30200 Bagnols-sur-Cèze (<a href="#">Google Maps</a>)</div>
<script>var Event_Start_Time = "10:30:00";</script>
<h3 id="event_subtitle">Qualifier</h3><div class="markdown"><p>Breaking crew battle and popping showcase</p></div>`;

describe("parseDetail", () => {
  it("extracts venue, address, time and styles", () => {
    const d = parseDetail(DETAIL, { title: "Qualifier", category: "Battle" });
    expect(d).toMatchObject({
      startTime: "10:30",
      venue: "La pyramide",
      address: "4 Rue Racine, 30200 Bagnols-sur-Cèze",
      countryCode: "FR",
      country: "France",
      genre: "battle",
    });
    expect(d.styles).toEqual(expect.arrayContaining(["breaking", "popping", "hip-hop"]));
  });
});

describe("parseDetail without a venue", () => {
  it("falls back to the announced place", () => {
    const html = `<div class="event_location"><b><img alt="NO" title="Norway"> Note:</b><br>Oslo the venue has not yet been announced.</div>`;
    const d = parseDetail(html, { title: "Nordic Qualifier", category: "Battle" });
    expect(d).toMatchObject({ venue: null, address: null, place: "Oslo", countryCode: "NO" });
  });
});
