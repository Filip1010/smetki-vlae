import { useSettings } from '../context/SettingsContext';
import { getHouse, type House } from '../data/houses';

export function useHouse(): House {
  const { settings } = useSettings();
  return getHouse(settings.activeHouseId);
}
