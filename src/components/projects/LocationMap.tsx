import { useEffect, useState, useRef } from "react"
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Popup } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix for default marker icon in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
})

interface LocationMapProps {
  latitude: number | null
  longitude: number | null
  onLocationChange: (lat: number, lng: number) => void
}

function DraggableMarker({ 
  position, 
  onPositionChange 
}: { 
  position: [number, number]
  onPositionChange: (lat: number, lng: number) => void 
}) {
  const [markerPosition, setMarkerPosition] = useState(position)
  const isDraggingRef = useRef(false)

  // Only update position from props if we're not currently dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      const latDiff = Math.abs(markerPosition[0] - position[0])
      const lngDiff = Math.abs(markerPosition[1] - position[1])
      // Only update if difference is significant (more than 0.0001 degrees)
      if (latDiff > 0.0001 || lngDiff > 0.0001) {
        setMarkerPosition(position)
      }
    }
  }, [position, markerPosition])

  const eventHandlers = {
    dragstart: () => {
      isDraggingRef.current = true
    },
    dragend: (e: L.DragEndEvent) => {
      isDraggingRef.current = false
      const marker = e.target
      if (marker != null) {
        const latlng = marker.getLatLng()
        const newPosition: [number, number] = [latlng.lat, latlng.lng]
        setMarkerPosition(newPosition)
        // Call onPositionChange with both lat and lng
        onPositionChange(latlng.lat, latlng.lng)
      }
    },
  }

  return (
    <Marker
      position={markerPosition}
      draggable={true}
      eventHandlers={eventHandlers}
    >
      <Popup>Drag to set location</Popup>
    </Marker>
  )
}

function MapClickHandler({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng
      // Call onLocationChange with both lat and lng
      onLocationChange(lat, lng)
    },
  })
  return null
}

function MapUpdater({ latitude, longitude, skipUpdate }: { latitude: number | null; longitude: number | null; skipUpdate: boolean }) {
  const map = useMap()

  useEffect(() => {
    // Only update map view if coordinates were manually entered (not from dragging/clicking)
    if (!skipUpdate && latitude && longitude) {
      map.setView([latitude, longitude], map.getZoom(), { animate: true })
    }
  }, [latitude, longitude, map, skipUpdate])

  return null
}

export function LocationMap({ latitude, longitude, onLocationChange }: LocationMapProps) {
  // Default center (Dubai, UAE - common location for projects)
  const defaultCenter: [number, number] = [25.2048, 55.2708]
  const center: [number, number] = 
    latitude && longitude ? [latitude, longitude] : defaultCenter

  // Use default center if no coordinates provided, otherwise use provided coordinates
  const markerPosition: [number, number] = 
    latitude && longitude ? [latitude, longitude] : defaultCenter

  // Track if update came from map interaction (click/drag) to avoid circular updates
  const skipMapUpdateRef = useRef(false)

  const handleLocationChange = (lat: number, lng: number) => {
    skipMapUpdateRef.current = true
    onLocationChange(lat, lng)
    // Reset flag after a short delay
    setTimeout(() => {
      skipMapUpdateRef.current = false
    }, 100)
  }

  return (
    <div className="w-full h-[300px] rounded-md border overflow-hidden">
      <MapContainer
        center={center}
        zoom={latitude && longitude ? 13 : 11}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onLocationChange={handleLocationChange} />
        <MapUpdater latitude={latitude} longitude={longitude} skipUpdate={skipMapUpdateRef.current} />
        <DraggableMarker 
          position={markerPosition}
          onPositionChange={handleLocationChange}
        />
      </MapContainer>
    </div>
  )
}
