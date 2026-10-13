"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import maplibregl, { type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Style vectoriel public, sans clé API (OpenFreeMap — un seul domaine sert
// le style, les tuiles, les glyphes et le sprite). Le filtre CSS ci-dessous
// assombrit ce fond clair pour rester cohérent avec le thème sombre du
// site ; remplacer par un style sombre dédié si une fidélité cartographique
// plus poussée est nécessaire un jour.
const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

// Centre approximatif de la Suisse romande (région lémanique).
const INITIAL_CENTER: [number, number] = [6.85, 46.55];
const INITIAL_ZOOM = 8;

interface CityPoint {
  citySlug: string;
  name: string;
  canton: string;
  lat: number;
  lng: number;
  count: number;
}

function buildPopupHtml(
  locale: string,
  citySlug: string,
  name: string,
  canton: string,
  count: number,
  countLabel: string,
  linkLabel: string,
): string {
  const safeName = name.replace(/[<>&]/g, "");
  const safeCanton = canton.replace(/[<>&]/g, "");
  return `
    <div style="font-family: var(--font-inter, sans-serif); font-size: 13px; color: #0E1116; display: flex; flex-direction: column; gap: 4px;">
      <strong>${safeName} (${safeCanton})</strong>
      <span>${count} ${countLabel}</span>
      <a href="/${locale}/?city=${encodeURIComponent(citySlug)}" style="color: #8a4f63; font-weight: 500;">${linkLabel}</a>
    </div>
  `;
}

export function ProfileMap({ locale }: { locale: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("map");

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let map: maplibregl.Map | null = null;

    async function init() {
      let cities: CityPoint[] = [];
      try {
        const response = await fetch("/api/profiles/map");
        if (!response.ok) throw new Error("request_failed");
        const data = (await response.json()) as { cities: CityPoint[] };
        cities = data.cities;
      } catch {
        if (!cancelled) setError(t("loadError"));
        return;
      }

      if (cancelled || !containerRef.current) return;

      map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLE_URL,
        center: INITIAL_CENTER,
        zoom: INITIAL_ZOOM,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

      map.on("error", () => {
        if (!cancelled) setError(t("loadError"));
      });

      map.on("load", () => {
        if (cancelled || !map) return;

        const geojson: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features: cities.map((city) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [city.lng, city.lat] },
            properties: {
              citySlug: city.citySlug,
              name: city.name,
              canton: city.canton,
              count: city.count,
            },
          })),
        };

        map.addSource("profile-cities", {
          type: "geojson",
          data: geojson,
          cluster: true,
          clusterRadius: 60,
          clusterProperties: { sum: ["+", ["get", "count"]] },
        });

        map.addLayer({
          id: "clusters",
          type: "circle",
          source: "profile-cities",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#C9A3B3",
            "circle-opacity": 0.85,
            "circle-radius": ["step", ["get", "sum"], 18, 5, 24, 15, 30],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#0E1116",
          },
        });

        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "profile-cities",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "sum"],
            "text-font": ["Noto Sans Regular"],
            "text-size": 13,
          },
          paint: { "text-color": "#1A1319" },
        });

        map.addLayer({
          id: "city-point",
          type: "circle",
          source: "profile-cities",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": "#C9A3B3",
            "circle-opacity": 0.85,
            "circle-radius": 16,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#0E1116",
          },
        });

        map.addLayer({
          id: "city-count",
          type: "symbol",
          source: "profile-cities",
          filter: ["!", ["has", "point_count"]],
          layout: {
            "text-field": ["get", "count"],
            "text-font": ["Noto Sans Regular"],
            "text-size": 13,
          },
          paint: { "text-color": "#1A1319" },
        });

        for (const layerId of ["clusters", "city-point"]) {
          map.on("mouseenter", layerId, () => {
            if (map) map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", layerId, () => {
            if (map) map.getCanvas().style.cursor = "";
          });
        }

        map.on("click", "clusters", async (e) => {
          if (!map) return;
          const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
          const feature = features[0];
          if (!feature || feature.geometry.type !== "Point") return;
          const clusterId = feature.properties?.cluster_id as number;
          const pointCount = feature.properties?.point_count as number;
          const source = map.getSource("profile-cities") as GeoJSONSource;

          const leaves = await source.getClusterLeaves(clusterId, pointCount, 0);
          const distinctCities = new Set(leaves.map((leaf) => leaf.properties?.citySlug));

          if (distinctCities.size > 1) {
            const expansionZoom = await source.getClusterExpansionZoom(clusterId);
            map.easeTo({
              center: feature.geometry.coordinates as [number, number],
              zoom: expansionZoom,
            });
            return;
          }

          const only = leaves[0]?.properties;
          if (!only) return;
          new maplibregl.Popup()
            .setLngLat(feature.geometry.coordinates as [number, number])
            .setHTML(
              buildPopupHtml(
                locale,
                only.citySlug,
                only.name,
                only.canton,
                feature.properties?.sum ?? only.count,
                t("profileCount"),
                t("viewCity"),
              ),
            )
            .addTo(map);
        });

        map.on("click", "city-point", (e) => {
          if (!map) return;
          const feature = e.features?.[0];
          if (!feature || feature.geometry.type !== "Point") return;
          const { citySlug, name, canton, count } = feature.properties as {
            citySlug: string;
            name: string;
            canton: string;
            count: number;
          };
          new maplibregl.Popup()
            .setLngLat(feature.geometry.coordinates as [number, number])
            .setHTML(buildPopupHtml(locale, citySlug, name, canton, count, t("profileCount"), t("viewCity")))
            .addTo(map);
        });
      });
    }

    init();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [locale, t]);

  return (
    <div className="overflow-hidden rounded-xl3 border border-hairline bg-surface-raised">
      {error ? (
        <div className="flex h-[420px] items-center justify-center p-6 text-center text-sm text-ink2-faint">
          {error}
        </div>
      ) : (
        <div ref={containerRef} className="h-[420px] w-full [filter:invert(1)_hue-rotate(185deg)_brightness(0.95)_contrast(0.9)]" />
      )}
    </div>
  );
}
