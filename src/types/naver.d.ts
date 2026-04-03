declare namespace naver {
    namespace maps {
        class Map {
            constructor(container: HTMLElement, options: MapOptions);
            fitBounds(bounds: LatLngBounds, options?: { top?: number; right?: number; bottom?: number; left?: number }): void;
            setCenter(latlng: LatLng): void;
            getCenter(): LatLng;
        }

        interface MapOptions {
            center?: LatLng;
            zoom?: number;
        }

        class LatLng {
            constructor(lat: number, lng: number);
            lat(): number;
            lng(): number;
        }

        class LatLngBounds {
            constructor(sw?: LatLng, ne?: LatLng);
            extend(latlng: LatLng): void;
        }

        class Marker {
            constructor(options: MarkerOptions);
            setMap(map: Map | null): void;
        }

        interface MarkerOptions {
            position: LatLng;
            map?: Map;
            icon?: MarkerIcon;
        }

        interface MarkerIcon {
            content: string;
            anchor?: Point;
        }

        class Point {
            constructor(x: number, y: number);
        }

        class InfoWindow {
            constructor(options: InfoWindowOptions);
            open(map: Map, anchor: Marker): void;
            close(): void;
        }

        interface InfoWindowOptions {
            content: string;
            borderWidth?: number;
            backgroundColor?: string;
        }

        namespace Event {
            function addListener(target: Marker | Map, type: string, handler: () => void): void;
        }
    }
}
