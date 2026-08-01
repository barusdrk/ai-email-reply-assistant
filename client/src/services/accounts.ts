import api from "./api.js";

export async function connectGmail() {
  const response =
    await api.get<{
      url:string;
    }>(
      "/auth/google"
    );

  window.location.href =
    response.data.url;
}

export async function connectOutlook() {
  const response =
    await api.get<{
      url:string;
    }>(
      "/auth/microsoft"
    );

  window.location.href =
    response.data.url;
}

export async function disconnectGmail() {
  await api.post(
    "/auth/google/disconnect"
  );
}

export async function disconnectOutlook() {
  await api.post(
    "/auth/microsoft/disconnect"
  );
}
