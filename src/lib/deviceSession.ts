// Keep the pairing credential in this page's memory, never in the public bundle.
let deviceToken = '';
export const getDeviceToken = () => deviceToken;
export const setDeviceToken = (token: string) => { deviceToken = token; };
