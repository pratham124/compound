import { AppState } from 'react-native';
import {
  isProtectedDataAvailable,
  queryCategorySamples,
  queryQuantitySamples,
  subscribeToChanges,
} from '@kingstinct/react-native-healthkit';
import { launchId, upload } from './upload';

export const SLEEP = 'HKCategoryTypeIdentifierSleepAnalysis';
export const STEPS = 'HKQuantityTypeIdentifierStepCount';
export const RHR = 'HKQuantityTypeIdentifierRestingHeartRate';
export const HRV = 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN';
export const TYPES = [SLEEP, STEPS, RHR, HRV] as const;
type TypeId = (typeof TYPES)[number];

const WINDOW_MS = 48 * 60 * 60 * 1000;

type SampleLike = {
  uuid: string;
  startDate: Date;
  endDate: Date;
  sourceRevision: { source: { name: string } };
  quantity?: number;
  unit?: string;
  value?: number;
};

async function readNewest(type: TypeId): Promise<readonly SampleLike[]> {
  const filter = { date: { startDate: new Date(Date.now() - WINDOW_MS), endDate: new Date() } };
  if (type === SLEEP) {
    return queryCategorySamples(SLEEP, { limit: 5, ascending: false, filter });
  }
  return queryQuantitySamples(type, { limit: 5, ascending: false, filter });
}

export async function handleWake(type: string, errorMessage?: string): Promise<void> {
  const readAt = new Date().toISOString();
  const appState = AppState.currentState;
  let protectedData: boolean | null = null;
  try {
    protectedData = isProtectedDataAvailable();
  } catch {}

  let samples: Record<string, unknown>[] = [];
  let queryError: string | undefined;
  try {
    const found = await readNewest(type as TypeId);
    samples = found.map((s) => ({
      uuid: s.uuid,
      startDate: s.startDate.toISOString(),
      endDate: s.endDate.toISOString(),
      value: s.value,
      quantity: s.quantity,
      unit: s.unit,
      source: s.sourceRevision.source.name,
    }));
  } catch (e) {
    queryError = e instanceof Error ? e.message : String(e);
  }

  await upload({
    event: 'wake',
    type,
    readAt,
    appState,
    protectedData,
    errorMessage: errorMessage ?? null,
    queryError,
    samples,
    sampleCount: samples.length,
    launchId,
  });
}

export function subscribeAll(): void {
  for (const type of TYPES) {
    subscribeToChanges(type, ({ typeIdentifier, errorMessage }) => {
      void handleWake(typeIdentifier ?? type, errorMessage ?? undefined);
    });
  }
}

export async function sendLaunch(): Promise<void> {
  await upload({ event: 'launch', readAt: new Date().toISOString(), appState: AppState.currentState, launchId });
}
