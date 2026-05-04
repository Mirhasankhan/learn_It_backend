import config from ".";

export const moyasarConfig = {
  baseURL: "https://api.moyasar.com/v1",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded", 
    Authorization:
      "Basic " +
      Buffer.from(`${config.moyasar.moyasar_secret}:`).toString("base64"),
  },
};
