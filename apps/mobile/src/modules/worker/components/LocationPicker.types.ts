export type MapCoordinate = { latitude: number; longitude: number };

export type LocationPickerProps = {
  coordinate: MapCoordinate;
  onChange(coordinate: MapCoordinate): void;
};
