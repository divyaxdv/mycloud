import { createSlice } from "@reduxjs/toolkit";

const filesSlice = createSlice({
  name: "files",
  initialState: {
    list: [],
    loading: false,
  },
  reducers: {
    setFiles: (state, action) => {
      state.list = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
});

export const { setFiles, setLoading } = filesSlice.actions;
export default filesSlice.reducer;
