import { registerRootComponent } from 'expo';

import App from './App';
import { sendLaunch, subscribeAll } from './src/health';

// Module scope on purpose: this must run on a background cold launch with no UI mounted.
subscribeAll();
void sendLaunch();

registerRootComponent(App);
