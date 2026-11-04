// Phiên bản API: đọc từ apps/api/package.json (tăng thủ công trong mỗi PR có thay đổi API, xem README "Phiên bản").
import pkg from "../package.json" with { type: "json" };

export const API_VERSION: string = pkg.version;
