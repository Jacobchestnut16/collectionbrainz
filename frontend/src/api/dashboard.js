import api from "./client";

export const getSitewide = () =>
    api.get("/dashboard/sitewide/releases");

export const getFresh = () =>
    api.get("/dashboard/fresh-releases");

export const getUserTop = (username) =>
    api.get(`/dashboard/user/top-albums/${username}`);

export const getUserHistory = (username) =>
    api.get(`/dashboard/user/history/${username}`);