"use client";

import { useState, useRef } from "react";
import { GoogleMap, useJsApiLoader, Autocomplete, MarkerF } from "@react-google-maps/api";

const defaultCenter = { lat: 36.1912, lng: 5.4124 };

interface MosqueData {
  masjid_name: string;
  google_place_id: string;
  latitude: number;
  longitude: number;
  formatted_address: string;
}

interface MosqueStepProps {
  onNext: (data: MosqueData) => void;
  onBack: () => void;
}

const libraries: "places"[] = ["places"];

export default function MosqueStep({ onNext, onBack }: MosqueStepProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [selectedPlace, setSelectedPlace] = useState<MosqueData | null>(null);
  const [error, setError] = useState("");

  const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
    autocompleteInstance.setComponentRestrictions({ country: "dz" });
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();

      if (!place.geometry || !place.geometry.location || !place.place_id) {
        setError("يرجى اختيار مسجد صالح ومسجل على الخريطة.");
        return;
      }

      setError("");

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      const extractedData: MosqueData = {
        masjid_name: place.name || "مسجد غير مسمى",
        google_place_id: place.place_id,
        latitude: lat,
        longitude: lng,
        formatted_address: place.formatted_address || "",
      };

      setSelectedPlace(extractedData);
      setMapCenter({ lat, lng });
    }
  };

  const handleNextStep = () => {
    if (!selectedPlace) {
      setError("يرجى البحث عن المسجد واختياره من القائمة أولاً.");
      return;
    }
    onNext(selectedPlace);
  };

  if (loadError) return <div className="text-red-500 text-center p-4 font-bold">حدث خطأ أثناء تحميل خرائط جوجل.</div>;
  if (!isLoaded) return <div className="text-center p-4 text-gray-500 font-medium">جاري تشغيل نظام الخرائط الذكي...</div>;

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-6 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xl" dir="rtl">
      <div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white">معلومات المسجد الجغرافية</h2>
        <p className="text-gray-500 text-sm mt-1">ابحث عن اسم المسجد الذي تعمل فيه وسيحدد النظام موقعه تلقائياً وبدقة ⚡</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-800 text-sm font-semibold text-center">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">اسم المسجد في الخرائط:</label>
        <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
          <input
            type="text"
            placeholder="اكتب اسم المسجد (مثال: مسجد عمر بن الخطاب سطيف)..."
            className="w-full px-5 py-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />
        </Autocomplete>
      </div>

      <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 h-64 shadow-inner">
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={mapCenter}
          zoom={selectedPlace ? 16 : 6}
          options={{
            disableDefaultUI: true,
            zoomControl: true,
          }}
        >
          {selectedPlace && (
            <MarkerF position={{ lat: selectedPlace.latitude, lng: selectedPlace.longitude }} />
          )}
        </GoogleMap>
      </div>

      {selectedPlace && (
        <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/30">
          <p className="text-xs text-emerald-800 dark:text-emerald-400 font-bold">📍 الموقع المؤكد برمجياً:</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mt-1">{selectedPlace.formatted_address}</p>
        </div>
      )}

      <div className="flex items-center gap-4 pt-4">
        <button
          onClick={handleNextStep}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl transition shadow-md active:scale-95"
        >
          الانتقال للخطوة التالية ──►
        </button>
        <button
          onClick={onBack}
          className="px-6 py-4 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-200 transition"
        >
          السابق
        </button>
      </div>
    </div>
  );
}