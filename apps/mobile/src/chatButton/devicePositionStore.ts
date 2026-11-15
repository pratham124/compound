import AsyncStorage from '@react-native-async-storage/async-storage';

import { createPositionStore } from './positionStore.ts';

export const devicePositionStore = createPositionStore(AsyncStorage);
