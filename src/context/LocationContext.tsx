import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
}

interface LocationContextType {
  location: Location | null;
  loading: boolean;
  error: string | null;
  campus: string;
  setCampus: (c: string) => void;
  refresh: () => void;
}

const LocationContext = createContext<LocationContextType | null>(null);

const CAMPUS_COORDS: Record<string, { lat: number; lng: number }> = {
  'UoN Main Campus':    { lat: -1.2792, lng: 36.8167 },
  'Strathmore':         { lat: -1.3100, lng: 36.8120 },
  'JKUAT Main':         { lat: -1.0895, lng: 37.0122 },
  'KU Main Campus':     { lat: -1.1756, lng: 36.9356 },
  'Mount Kenya Uni':    { lat: -0.4195, lng: 36.9536 },
  'TU Kenya':           { lat: -0.3031, lng: 36.0800 },
};

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [campus,   setCampus]   = useState<string>(() => localStorage.getItem('kampas_campus') || 'UoN Main Campus');

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setLoading(false);
      },
      () => {
        const coords = CAMPUS_COORDS[campus];
        if (coords) setLocation(coords);
        setError('Using campus location');
        setLoading(false);
      },
      { timeout: 8000 }
    );
  };

  useEffect(() => {
    const coords = CAMPUS_COORDS[campus];
    if (coords && !location) setLocation(coords);
    localStorage.setItem('kampas_campus', campus);
  }, [campus]);

  useEffect(() => { getLocation(); }, []);

  return (
    <LocationContext.Provider value={{ location, loading, error, campus, setCampus, refresh: getLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export const useLocation2 = () => {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation2 must be used inside LocationProvider');
  return ctx;
};
