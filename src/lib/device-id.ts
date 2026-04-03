const DEVICE_ID_KEY = "HEALTH_DEVICE_ID";

export function getDeviceId(): string {
    if (typeof window === "undefined") return "";
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
}
