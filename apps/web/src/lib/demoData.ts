import type { Cafe, Place } from './types';

/**
 * Made-up cafés placed around Kamppi, Helsinki, for demo mode and end-to-end tests.
 * The names are invented; the opening hours cover the formats the parser supports.
 */
export const DEMO_ORIGIN: Place = {
  label: 'Kamppi, Helsinki (sample data)',
  position: { lat: 60.1688, lng: 24.9316 },
};

export const DEMO_CAFES: Cafe[] = [
  {
    id: 'demo/1',
    name: 'Copper Kettle',
    position: { lat: 60.1693, lng: 24.9329 },
    address: 'Sample Street 1, Helsinki',
    openingHours: 'Mo-Fr 07:00-18:00; Sa,Su 09:00-17:00',
    website: 'https://example.com/',
  },
  {
    id: 'demo/2',
    name: 'Night Owl Espresso',
    position: { lat: 60.1675, lng: 24.9298 },
    address: 'Sample Street 2, Helsinki',
    openingHours: '24/7',
  },
  {
    id: 'demo/3',
    name: 'Harbour Roasters',
    position: { lat: 60.1661, lng: 24.9372 },
    address: 'Sample Street 3, Helsinki',
    openingHours: 'Mo-Sa 08:00-20:00; Su off',
  },
  {
    id: 'demo/4',
    name: 'Little Fika',
    position: { lat: 60.1712, lng: 24.9271 },
    openingHours: 'Tu-Sa 10:00-16:00',
  },
  {
    id: 'demo/5',
    name: 'Tram Stop Coffee',
    position: { lat: 60.1724, lng: 24.9388 },
    address: 'Sample Street 5, Helsinki',
  },
  {
    id: 'demo/6',
    name: 'Late Shift',
    position: { lat: 60.1647, lng: 24.9254 },
    openingHours: 'Fr,Sa 18:00-02:00',
  },
  {
    id: 'demo/7',
    name: 'Birch & Bean',
    position: { lat: 60.1741, lng: 24.9302 },
    address: 'Sample Street 7, Helsinki',
    openingHours: 'Mo-Fr 07:30-12:00,13:00-17:00; PH off',
  },
  {
    id: 'demo/8',
    name: 'The Slow Pour',
    position: { lat: 60.1629, lng: 24.9344 },
    openingHours: 'Mo-Su 09:00-21:00',
  },
  {
    id: 'demo/9',
    name: 'Market Hall Cups',
    position: { lat: 60.1678, lng: 24.9451 },
    address: 'Sample Street 9, Helsinki',
    openingHours: 'Mo-Sa 08:00-18:00',
  },
  {
    id: 'demo/10',
    name: 'Seaside Brew',
    position: { lat: 60.1601, lng: 24.9229 },
    openingHours: 'sunrise-sunset',
  },
];
