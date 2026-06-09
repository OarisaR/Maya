import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
} from "react-leaflet";

type Hospital = {
  name: string;
  address: string;
  contact: string;
  ambulance: string;
  lat: number;
  lng: number;
};

type Props = {
  hospitals: Hospital[];
};

export default function EmergencyPanel({ hospitals }: Props) {

  const [userPosition, setUserPosition] = useState<
    [number, number] | null
  >(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPosition([
          position.coords.latitude,
          position.coords.longitude,
        ]);
      },

      (error) => {
        console.error(error);
      }
    );
  }, []);

  if (!hospitals.length) return null;

  // Eva's Change: open google maps directly
  const openMaps = (lat: number, lng: number) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      "_blank"
    );
  };

  return (
    <div className="space-y-4 mt-4">
      <h2 className="text-xl font-bold text-red-500">
        🚨 Nearby Emergency Hospitals
      </h2>

      {hospitals.map((h, i) => (
        <div
          key={i}
          className="border rounded-2xl p-4 bg-card shadow-sm"
        >
          <h3 className="font-semibold text-lg mb-2">
            {i + 1}. {h.name}
          </h3>

          <div className="space-y-1 text-sm">
            <p>
              📍 <span className="font-medium">Address:</span>{" "}
              {h.address}
            </p>

            <p>
              📞 <span className="font-medium">Contact:</span>{" "}
              {h.contact}
            </p>

            <p>
              🚑 <span className="font-medium">Ambulance:</span>{" "}
              {h.ambulance}
            </p>
          </div>

          {/* Eva's Change: Google Maps Button */}
          <button
            onClick={() => openMaps(h.lat, h.lng)}
            className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition"
          >
            🗺️ Open in Maps
          </button>

          {/* Eva's Change: Embedded Interactive Map */}
          <div
            className="mt-4 rounded-xl overflow-hidden border"
            style={{ height: "250px" }}
          >
            <MapContainer
              {...({
                center:
                  userPosition || [
                    Number(h.lat),
                    Number(h.lng),
                  ],

                zoom: 15,

                style: {
                  height: "100%",
                  width: "100%",
                },
              } as any)}
            >
              <TileLayer
                {...({
                  attribution:
                    "&copy; OpenStreetMap contributors",
                  url:
                    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                } as any)}
              />
              <Marker
                position={[
                  Number(h.lat),
                  Number(h.lng),
                ]}
              >
                <Popup>
                  <div className="space-y-1">
                    <div className="font-semibold">
                      {h.name}
                    </div>

                    <div>{h.address}</div>

                    <button
                      onClick={() =>
                        openMaps(h.lat, h.lng)
                      }
                      className="text-blue-500 underline"
                    >
                      Open in Google Maps
                    </button>
                  </div>
                </Popup>
              </Marker>

              {userPosition && (
                <Marker position={userPosition}>
                  <Popup>Your Location</Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        </div>
      ))}
    </div>
  );
}