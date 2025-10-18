const ACCESS_KEY = "teacare.accessToken";
const REFRESH_KEY = "teacare.refreshToken";

export const tokenStorage = {
  getAccess() {
    return localStorage.getItem(ACCESS_KEY);
  },
  setAccess(token) {
    if (token) {
      localStorage.setItem(ACCESS_KEY, token);
    }
  },
  clearAccess() {
    localStorage.removeItem(ACCESS_KEY);
  },
  getRefresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  setRefresh(token) {
    if (token) {
      localStorage.setItem(REFRESH_KEY, token);
    }
  },
  clearRefresh() {
    localStorage.removeItem(REFRESH_KEY);
  },
  clearAll() {
    this.clearAccess();
    this.clearRefresh();
  }
};
