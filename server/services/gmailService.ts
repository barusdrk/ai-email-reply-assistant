export function getGoogleAuthUrl() {
  return {
    url: "https://accounts.google.com/o/oauth2/v2/auth",
  };
}

export async function exchangeCode(
  code: string
) {
  return {
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
    code,
  };
}

export async function disconnectAccount() {
  return true;
}

export async function connectionStatus() {
  return {
    connected: false,
  };
}
