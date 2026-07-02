import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Matches Firebase RTDB /live structure
export interface LiveData {
  fridge1: { temp: number; hum: number };
  fridge2: { temp: number; hum: number };
  doors: { d1: number; d2: number };
  led: boolean;
  updatedAt: number;
}

interface FridgeState {
  connected: boolean;
  liveData: LiveData | null;
}

const initialState: FridgeState = {
  connected: false,
  liveData: null,
};

const fridgeSlice = createSlice({
  name: 'fridge',
  initialState,
  reducers: {
    setConnected(state, action: PayloadAction<boolean>) {
      state.connected = action.payload;
    },
    setLiveData(state, action: PayloadAction<LiveData | null>) {
      state.liveData = action.payload;
    }
  },
});

export const { setConnected, setLiveData } = fridgeSlice.actions;
export default fridgeSlice.reducer;
