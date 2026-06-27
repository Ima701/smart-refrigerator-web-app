import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SettingsState {
  maxTempThreshold: number;
  maxHumThreshold: number;
}

const initialState: SettingsState = {
  maxTempThreshold: 8.0,
  maxHumThreshold: 80.0,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateThresholds(state, action: PayloadAction<{ temp?: number; hum?: number }>) {
      if (action.payload.temp !== undefined) {
        state.maxTempThreshold = action.payload.temp;
      }
      if (action.payload.hum !== undefined) {
        state.maxHumThreshold = action.payload.hum;
      }
    },
  },
});

export const { updateThresholds } = settingsSlice.actions;
export default settingsSlice.reducer;
