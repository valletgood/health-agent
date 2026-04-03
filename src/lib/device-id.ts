const DEVICE_ID_KEY = "HEALTH_DEVICE_ID";

function generateUUID(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    // Secure Context가 아닌 환경 (HTTP 모바일 등) 폴백
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
}

export function getDeviceId(): string {
    if (typeof window === "undefined") return "";
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        id = generateUUID();
        localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
}
