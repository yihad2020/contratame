import type { RequestCoordinate } from '@/modules/service-request/types';

export type RequestLocationPickerProps = {
  coordinate: RequestCoordinate;
  selected: boolean;
  onChange(coordinate: RequestCoordinate): void;
};

