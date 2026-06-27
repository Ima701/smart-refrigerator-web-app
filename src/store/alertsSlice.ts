import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AlertRecord {
  time: string;
  message: string;
}

interface AlertsState {
  alerts: AlertRecord[];
}

const initialState: AlertsState = {
  alerts: []
};

const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    addAlert(state, action: PayloadAction<string>) {
      const time = new Date().toLocaleTimeString();
      state.alerts = [{ time, message: action.payload }, ...state.alerts.slice(0, 15)];
    }
  }
});

export const { addAlert } = alertsSlice.actions;
export default alertsSlice.reducer;
