import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import hospitalsData from "@/data/hospitals.json";

const DIVISIONS = [
    "Dhaka Division",
    "Chittagong Division",
    "Sylhet Division",
    "Rajshahi Division",
    "Khulna Division",
    "Barishal Division",
    "Rangpur Division",
    "Mymensingh Division",
];

type Hospital = {
    name: string;
    address: string;
    contact: string;
    lat: number;
    lng: number;
    region: string;
};

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function EmergencyMap() {
    const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
    const [locError, setLocError] = useState<string | null>(null);
    const [nearbyHospitals, setNearbyHospitals] = useState<(Hospital & { distance: number })[]>([]);
    const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
    const [divisionHospitals, setDivisionHospitals] = useState<Hospital[]>([]);
    const [locationRequested, setLocationRequested] = useState(false);

    // Step 1: get geolocation
    useEffect(() => {
        setLocationRequested(true);
        setLocError(null);

        if (!navigator.geolocation) {
            setLocError("Geolocation not supported on your device.");
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
        };

        const onSuccess = (pos: GeolocationPosition) => {
            setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setLocError(null);
        };

        const onError = (err: GeolocationPositionError) => {
            const messages: { [key: number]: string } = {
                1: "Location permission denied. Please enable location access in settings.",
                2: "Unable to retrieve your location. Please check your connection.",
                3: "Location request timed out. Please try again.",
            };
            setLocError(messages[err.code] || "Unable to access your location.");
        };

        navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
    }, []);

    // Step 2: compute nearest hospitals once position is known
    useEffect(() => {
        if (!userPos) return;
        const withDist = (hospitalsData as Hospital[])
            .map((h) => ({
                ...h,
                distance: haversineDistance(userPos.lat, userPos.lng, h.lat, h.lng),
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 3);
        setNearbyHospitals(withDist);
    }, [userPos]);

    // Get unique divisions from nearby hospitals (only if nearbyHospitals has data)
    const userDivisions = nearbyHospitals.length > 0
        ? [...new Set(nearbyHospitals.map(h => h.region))]
        : [];

    // Filter out divisions that appear in nearby hospitals
    const otherDivisions = DIVISIONS.filter(div => !userDivisions.includes(div));

    const handleDivisionSelect = (division: string) => {
    setSelectedDivision(division);
    
    const alreadyShownNames = new Set(nearbyHospitals.map(h => h.name));
    
    const hospitals = (hospitalsData as Hospital[])
        .filter((h) => h.region === division && !alreadyShownNames.has(h.name))
        .slice(0, 3);
    
    setDivisionHospitals(hospitals);
};

    // Debug: log what's happening
    console.log("nearbyHospitals length:", nearbyHospitals.length);
    console.log("userDivisions:", userDivisions);
    console.log("otherDivisions:", otherDivisions);

    return (
        <div className="mt-3 space-y-3">

            {/* Concern banner */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                    <strong>Please contact a doctor immediately.</strong> Nearby hospitals are shown below.
                    If this is life-threatening, call <strong>999</strong> now.
                </span>
            </div>

            {/* Location loading state */}
            {!locError && !userPos && locationRequested && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                    <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    Fetching your location...
                </div>
            )}

            {/* Location denied */}
            {locError && (
                <p className="text-xs text-muted-foreground px-1">{locError}</p>
            )}

            {/* Nearby Hospitals List */}
            {userPos && nearbyHospitals.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground px-1">
                        Nearby Hospitals (within {nearbyHospitals[nearbyHospitals.length - 1]?.distance.toFixed(1)} km)
                    </p>
                    {nearbyHospitals.map((h, i) => (
                        <div
                            key={i}
                            className="flex items-start justify-between px-3 py-2 rounded-lg bg-card border border-border text-xs gap-2"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="font-medium truncate">{h.name}</div>
                                <div className="text-muted-foreground truncate text-[11px]">{h.address}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">{h.region}</div>
                            </div>
                            <div className="text-right shrink-0 space-y-0.5">
                                <div className="text-primary font-medium">{h.distance.toFixed(1)} km</div>
                                <a
                                    href={`tel:${h.contact}`}
                                    className="text-muted-foreground hover:text-foreground underline block text-[11px]"
                                >
                                    {h.contact}
                                </a>
                                {userPos && (<a href={userPos
                                    ? `https://www.google.com/maps/dir/?api=1&origin=${userPos.lat},${userPos.lng}&destination=${h.lat},${h.lng}&travelmode=driving`
                                    : `https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="text-[11px] text-blue-500 hover:text-blue-600 underline block">
                                    Open in Map
                                </a>)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* If user location is known but no nearby hospitals found */}
            {userPos && nearbyHospitals.length === 0 && (
                <div className="text-xs text-muted-foreground px-1 py-2">
                    No hospitals found within 20km of your location.
                </div>
            )}

            {/* Division follow-up prompt - ONLY show when nearby hospitals are loaded AND there are other divisions */}
            {nearbyHospitals.length > 0 && otherDivisions.length > 0 && (
                <div className="pt-3 border-t border-border mt-2">
                    <p className="text-xs text-muted-foreground mb-2">
                        Want to see hospitals from another division?
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {otherDivisions.map((div) => (
                            <button
                                key={div}
                                onClick={() => handleDivisionSelect(div)}
                                className={`text-[11px] px-2.5 py-1 rounded-full border transition ${selectedDivision === div
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "border-border hover:border-primary/50 hover:bg-accent/40"
                                    }`}
                            >
                                {div.replace(" Division", "")}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Division hospital list */}
            {selectedDivision && divisionHospitals.length > 0 && (
                <div className="space-y-2 pt-1">
                    <p className="text-xs font-medium text-muted-foreground">
                        Hospitals in {selectedDivision}
                    </p>
                    {divisionHospitals.map((h, i) => (
                        <div
                            key={i}
                            className="px-3 py-2 rounded-lg bg-card border border-border text-xs space-y-0.5"
                        >
                            <div className="font-medium">{h.name}</div>
                            <div className="text-muted-foreground text-[11px]">{h.address}</div>
                            <a href={`tel:${h.contact}`} className="text-primary underline text-[11px]">
                                {h.contact}
                            </a>
                        </div>
                    ))}
                </div>
            )}

            {selectedDivision && divisionHospitals.length === 0 && (
                <p className="text-xs text-muted-foreground pt-1">No hospitals listed for this division yet.</p>
            )}
        </div>
    );
}